<?php

namespace App\Jobs;

use App\Services\ConflictDetectionService;
use App\Services\LLMService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessConflictDetectionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public string $jobId;
    public int $projectId;
    public int $tries = 3;
    public array $backoff = [10, 30, 90];
    public int $timeout = 180;

    public function __construct(string $jobId, int $projectId)
    {
        $this->jobId = $jobId;
        $this->projectId = $projectId;
    }

    public function handle(LLMService $llmService, ConflictDetectionService $conflictService): void
    {
        Log::info('ProcessConflictDetectionJob: Starting', [
            'job_id' => $this->jobId,
            'project_id' => $this->projectId,
        ]);

        try {
            // Poll the LLM service for job status (max 3 attempts, 5s apart)
            $result = null;
            for ($attempt = 1; $attempt <= 6; $attempt++) {
                Log::info("ProcessConflictDetectionJob: Poll attempt {$attempt}", [
                    'job_id' => $this->jobId,
                ]);

                $status = $llmService->getJobStatus($this->jobId);

                $state = $status['state'] ?? $status['status'] ?? 'unknown';

                if (in_array($state, ['completed', 'success', 'SUCCESS'])) {
                    $result = $status['result'] ?? $status['conflicts'] ?? [];
                    Log::info('ProcessConflictDetectionJob: Job completed', [
                        'job_id' => $this->jobId,
                        'conflict_count' => count($result),
                    ]);
                    break;
                }

                if (in_array($state, ['failed', 'error', 'ERROR'])) {
                    Log::error('ProcessConflictDetectionJob: LLM job failed', [
                        'job_id' => $this->jobId,
                        'status' => $status,
                    ]);
                    return;
                }

                // Wait before next poll
                sleep(5);
            }

            if ($result === null) {
                Log::warning('ProcessConflictDetectionJob: Timeout waiting for job', [
                    'job_id' => $this->jobId,
                ]);
                return;
            }

            // Write conflicts to JSON file for LLM context consumption
            $conflictPath = base_path("storage/app/conflicts/{$this->projectId}.json");
            $dir = dirname($conflictPath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            $jsonData = [
                'project_id' => $this->projectId,
                'generated_at' => now()->toIso8601String(),
                'conflicts' => $result,
            ];

            file_put_contents($conflictPath, json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            Log::info('ProcessConflictDetectionJob: Conflicts written to JSON', [
                'project_id' => $this->projectId,
                'path' => $conflictPath,
                'conflict_count' => count($result),
            ]);

            // Log activity
            app(\App\Http\Controllers\Api\ActivityLogController::class)->log(
                $this->projectId,
                null,
                $result !== null ? \App\Models\ActivityLog::ACTION_CONFLICT_DETECTED : 'conflict_detection_failed',
                $result !== null
                    ? "Conflict detection completed. Found " . count($result) . " conflict(s)."
                    : "Conflict detection completed with no results.",
                ['job_id' => $this->jobId, 'conflict_count' => count($result ?? [])]
            );

            if ($result !== null && count($result) > 0) {
                \App\Models\Notification::conflictDetected($this->projectId, "Project #{$this->projectId}", count($result));
            }

        } catch (\Exception $e) {
            Log::error('ProcessConflictDetectionJob: Failed', [
                'job_id' => $this->jobId,
                'project_id' => $this->projectId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
