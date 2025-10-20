<?php

namespace App\Jobs;

use App\Models\KnowledgeBase;
use App\Models\Project;
use App\Services\LLMService;
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

    public function handle(LLMService $llmService): void
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

            if (empty($documents)) {
                Log::warning('KBBuildJob: No documents with content found for project', ['project_id' => $this->projectId]);
                $kb->markAsFailed('No documents with content available to build knowledge base');
                return;
            }

            Log::info('KBBuildJob: Starting KB build', [
                'project_id' => $this->projectId,
                'documents_count' => count($documents),
            ]);

            // Call LLM service to build KB (use sync mode in job for immediate result)
            $result = $llmService->buildKnowledgeBase($this->projectId, $documents, 'sync');

            Log::info('KBBuildJob: KB build completed', [
                'project_id' => $this->projectId,
                'result' => $result,
            ]);

            // Update KB status
            if (isset($result['status']) && $result['status'] === 'completed') {
                $kb->markAsReady($result);
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
