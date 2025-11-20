<?php

namespace App\Jobs;

use App\Models\KnowledgeBase;
use App\Models\Project;
use App\Services\LLMService;
use App\Services\ConflictDetectionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class KBBuildJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $projectId;

    public int $tries = 1;

    public int $timeout = 300;

    public int $uniqueFor = 600;

    public function __construct(int $projectId)
    {
        $this->projectId = $projectId;
    }

    public function uniqueId(): string
    {
        return 'kb_build_' . $this->projectId;
    }

    public function handle(LLMService $llmService, ConflictDetectionService $conflictService): void
    {
        // Acquire a cache lock per project to prevent concurrent KB builds
        $lockKey = "kb_build_lock_{$this->projectId}";
        $lock = Cache::lock($lockKey, 600); // 10 minutes max

        $acquired = false;
        try {
            // Attempt to acquire lock without blocking
            $acquired = $lock->get();
            if (! $acquired) {
                Log::warning('KBBuildJob: Another KB build is already running for project', ['project_id' => $this->projectId]);
                return;
            }

            $project = Project::find($this->projectId);
            if (! $project) {
                throw new ModelNotFoundException("Project {$this->projectId} not found");
            }

            // Get or create KB record
            $kb = KnowledgeBase::firstOrCreate(
                ['project_id' => $this->projectId],
                ['status' => 'not_built']
            );

            // Collect documents for this project
            $documents = $project->documents()
                ->whereNotNull('content')
                ->where('content', '!=', '')
                ->get()
                ->map(function ($doc) {
                    return [
                        'content' => $doc->content,
                        'type' => $doc->type ?? 'document',
                        'meta' => [
                            'document_id' => $doc->id,
                            'filename' => $doc->original_filename ?? $doc->filename,
                            'file_type' => $doc->file_type,
                            'uploaded_at' => $doc->created_at->toIso8601String(),
                        ],
                    ];
                })->toArray();

            // Also collect requirements for this project (batch process all at once)
            $requirements = $project->requirements()
                ->whereNotNull('requirement_text')
                ->where('requirement_text', '!=', '')
                ->get()
                ->map(function ($req) {
                    $text = "Requirement: {$req->requirement_text}\nType: {$req->requirement_type}\nPriority: {$req->priority}";
                    return [
                        'content' => $text,
                        'type' => 'requirement',
                        'meta' => [
                            'requirement_id' => $req->id,
                            'document_id' => $req->document_id,
                            'project_id' => $req->project_id,
                            'confidence_score' => $req->confidence_score,
                            'requirement_type' => $req->requirement_type,
                            'priority' => $req->priority,
                            'requirement_number' => $req->requirement_number,
                        ],
                    ];
                })->toArray();

            // Combine documents and requirements for batch processing
            $documents = array_merge($documents, $requirements);

            if (empty($documents)) {
                Log::warning('KBBuildJob: No documents with content found for project', ['project_id' => $this->projectId]);
                $kb->markAsFailed('No documents with content available to build knowledge base');
                return;
            }

            Log::info('KBBuildJob: Starting KB build', [
                'project_id' => $this->projectId,
                'documents_count' => count($documents),
            ]);

            // Update progress: Starting KB build (0-50%)
            $kb->updateProgress(10, 'building_index');

            // Call LLM service to build KB (use sync mode in job for immediate result)
            $result = $llmService->buildKnowledgeBase($this->projectId, $documents, 'sync');

            Log::info('KBBuildJob: KB build completed', [
                'project_id' => $this->projectId,
                'result' => $result,
            ]);

            // Update progress: KB build complete, starting conflict detection (50%)
            $kb->updateProgress(50, 'detecting_conflicts');

            // Update KB status
            if (isset($result['status']) && $result['status'] === 'completed') {
                
                // ✨ Automatically trigger conflict detection after KB is built
                Log::info('KBBuildJob: Triggering conflict detection', [
                    'project_id' => $this->projectId
                ]);
                
                try {
                    $conflictResult = $conflictService->detectConflictsForProject($this->projectId);
                    
                    // Conflicts are detected and saved synchronously
                    if (isset($conflictResult['status']) && $conflictResult['status'] === 'completed') {
                        Log::info('KBBuildJob: Conflict detection completed', [
                            'project_id' => $this->projectId,
                            'conflicts_saved' => $conflictResult['conflicts_saved'] ?? 0
                        ]);
                        
                        // Update progress: Conflicts saved (100%)
                        $kb->updateProgress(100, 'completed');
                    }
                    
                    // Mark KB as ready
                    $kb->markAsReady($result);
                } catch (\Exception $e) {
                    // Don't fail KB build if conflict detection fails
                    Log::warning('KBBuildJob: Conflict detection failed, but KB build succeeded', [
                        'project_id' => $this->projectId,
                        'error' => $e->getMessage()
                    ]);
                    // Still mark KB as ready since the build itself succeeded
                    $kb->markAsReady($result);
                }
            } else {
                $kb->markAsFailed($result['error'] ?? 'Unknown error during KB build');
            }

        } catch (Throwable $e) {
            Log::error('KBBuildJob failed', [
                'project_id' => $this->projectId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Mark KB as failed
            $kb = KnowledgeBase::where('project_id', $this->projectId)->first();
            if ($kb) {
                $kb->markAsFailed($e->getMessage());
            }

            throw $e;
        } finally {
            // Release lock if held
            try {
                if ($acquired) {
                    $lock->release();
                }
            } catch (Throwable $e) {
                // Ignore lock release errors
            }
        }
    }
}
