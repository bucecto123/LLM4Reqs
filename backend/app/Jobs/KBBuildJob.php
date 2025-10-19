<?php

namespace App\Jobs;

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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
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
            // attempt to acquire lock without blocking
            $acquired = $lock->get();
            if (! $acquired) {
                Log::warning('KBBuildJob: Another KB build is already running for project', ['project_id' => $this->projectId]);
                return;
            }

            $project = Project::find($this->projectId);
            if (! $project) {
                throw new ModelNotFoundException("Project {$this->projectId} not found");
            }

            // Collect documents for this project
            $documents = $project->documents()->get()->map(function ($doc) {
                return [
                    'id' => $doc->id,
                    'filename' => $doc->filename,
                    'content' => $doc->content,
                    'file_type' => $doc->file_type,
                ];
            })->toArray();

            Log::info('KBBuildJob: Starting KB build', ['project_id' => $this->projectId, 'documents' => count($documents)]);

            // Call LLM service to build KB (async mode expected)
            $result = $llmService->buildKnowledgeBase($this->projectId, $documents);

            // Optionally persist KB metadata if table exists
            if (Schema::hasTable('knowledge_bases')) {
                try {
                    $payload = [
                        'llm_job_id' => $result['job_id'] ?? null,
                        'status' => $result['status'] ?? 'queued',
                        'updated_at' => now(),
                    ];

                    $existing = DB::table('knowledge_bases')
                        ->where('project_id', $this->projectId)
                        ->exists();

                    if ($existing) {
                        DB::table('knowledge_bases')
                            ->where('project_id', $this->projectId)
                            ->update($payload);
                    } else {
                        $payload['project_id'] = $this->projectId;
                        $payload['created_at'] = now();
                        DB::table('knowledge_bases')->insert($payload);
                    }
                } catch (Throwable $e) {
                    Log::warning('KBBuildJob: Failed to persist KB metadata', ['error' => $e->getMessage()]);
                }
            }

            Log::info('KBBuildJob: KB build requested', ['project_id' => $this->projectId, 'result' => $result]);
        } catch (Throwable $e) {
            Log::error('KBBuildJob failed', ['project_id' => $this->projectId, 'error' => $e->getMessage()]);
            throw $e;
        } finally {
            // Release lock if held
            try {
                if ($acquired) {
                    $lock->release();
                }
            } catch (Throwable $e) {
                // ignore
            }
        }
    }
}

