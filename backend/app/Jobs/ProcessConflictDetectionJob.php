<?php

namespace App\Jobs;

use App\Services\ConflictDetectionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessConflictDetectionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public string $jobId;
    public int $projectId;
    public int $tries = 20; // Retry up to 20 times
    public int $backoff = 5; // Wait 5 seconds between retries

    public function __construct(string $jobId, int $projectId)
    {
        $this->jobId = $jobId;
        $this->projectId = $projectId;
    }

    public function handle(ConflictDetectionService $conflictService): void
    {
        try {
            Log::info('ProcessConflictDetectionJob: Checking status', [
                'job_id' => $this->jobId,
                'project_id' => $this->projectId,
                'attempt' => $this->attempts()
            ]);

            // Get KB record to update progress
            $kb = \App\Models\KnowledgeBase::where('project_id', $this->projectId)->first();

            // Get job status from LLM service
            $status = $conflictService->getJobStatus($this->jobId);

            Log::info('ProcessConflictDetectionJob: Status received', [
                'job_id' => $this->jobId,
                'status' => $status['status'] ?? 'unknown'
            ]);

            if ($status['status'] === 'completed') {
                // Job is complete, save conflicts
                if (isset($status['conflicts']) && is_array($status['conflicts'])) {
                    // Update progress: Saving conflicts (90%)
                    if ($kb) {
                        $kb->updateProgress(90, 'saving_conflicts');
                    }
                    
                    $saved = $conflictService->saveConflicts($this->projectId, $status['conflicts']);

                    Log::info('ProcessConflictDetectionJob: Conflicts saved', [
                        'job_id' => $this->jobId,
                        'project_id' => $this->projectId,
                        'conflicts_saved' => $saved
                    ]);

                    // Append conflicts to the LLM-managed KB (incremental update)
                    try {
                        $llmService = app(\App\Services\LLMService::class);

                        $conflictDocs = [];
                        foreach ($status['conflicts'] as $c) {
                            $req1 = $c['req_id_1'] ?? ($c['requirement_id_1'] ?? '');
                            $req2 = $c['req_id_2'] ?? ($c['requirement_id_2'] ?? '');
                            $reason = $c['reason'] ?? ($c['conflict_description'] ?? 'No reason provided');
                            $confidence = $c['confidence'] ?? null;

                            $text = "Conflict between {$req1} and {$req2}: " . $reason;

                            $conflictDocs[] = [
                                'content' => $text,
                                'type' => 'conflict',
                                'meta' => [
                                    'conflict_id' => $c['conflict_id'] ?? null,
                                    'req_id_1' => $req1,
                                    'req_id_2' => $req2,
                                    'cluster_id' => $c['cluster_id'] ?? null,
                                    'confidence' => $confidence,
                                    'project_id' => $this->projectId,
                                ],
                            ];
                        }

                        if (!empty($conflictDocs)) {
                            // Use incremental KB API to append conflict documents; do not fail job on KB update error
                            try {
                                $res = $llmService->incrementalKBUpdate($this->projectId, $conflictDocs);
                                $skipped = $res['skipped_chunks'] ?? $res['skipped'] ?? 0;

                                Log::info('ProcessConflictDetectionJob: Appended conflicts to KB', [
                                    'project_id' => $this->projectId,
                                    'appended' => $res['added_chunks'] ?? count($conflictDocs),
                                    'skipped' => $skipped
                                ]);
                            } catch (\Exception $e) {
                                Log::warning('ProcessConflictDetectionJob: incremental KB update failed', [
                                    'project_id' => $this->projectId,
                                    'error' => $e->getMessage()
                                ]);
                            }
                        }
                    } catch (\Exception $e) {
                        Log::warning('ProcessConflictDetectionJob: Failed to append conflicts to KB', [
                            'project_id' => $this->projectId,
                            'error' => $e->getMessage()
                        ]);
                    }

                    // Mark as fully complete (100%)
                    if ($kb && $kb->status === 'building') {
                        // Get the KB build result from LLM service
                        $llmService = app(\App\Services\LLMService::class);
                        try {
                            $kbStatus = $llmService->getKBStatus($this->projectId);
                            $kb->markAsReady([
                                'index_path' => $kbStatus['index_path'] ?? null,
                                'meta_path' => $kbStatus['meta_path'] ?? null,
                                'total_chunks' => $kbStatus['total_chunks'] ?? 0,
                            ]);
                        } catch (\Exception $e) {
                            // If we can't get KB status, just mark with basic info
                            $kb->markAsReady([]);
                        }
                    }
                } else {
                    Log::info('ProcessConflictDetectionJob: No conflicts found', [
                        'job_id' => $this->jobId,
                        'project_id' => $this->projectId
                    ]);

                    // Mark as complete even with no conflicts
                    if ($kb && $kb->status === 'building') {
                        $llmService = app(\App\Services\LLMService::class);
                        try {
                            $kbStatus = $llmService->getKBStatus($this->projectId);
                            $kb->markAsReady([
                                'index_path' => $kbStatus['index_path'] ?? null,
                                'meta_path' => $kbStatus['meta_path'] ?? null,
                                'total_chunks' => $kbStatus['total_chunks'] ?? 0,
                            ]);
                        } catch (\Exception $e) {
                            $kb->markAsReady([]);
                        }
                    }
                }

                // Job complete - don't retry
                return;
            }

            if ($status['status'] === 'failed') {
                // Job failed
                Log::error('ProcessConflictDetectionJob: Conflict detection failed', [
                    'job_id' => $this->jobId,
                    'project_id' => $this->projectId,
                    'error' => $status['error'] ?? 'Unknown error'
                ]);
                
                // Mark KB as ready anyway since the build succeeded
                if ($kb && $kb->status === 'building') {
                    $llmService = app(\App\Services\LLMService::class);
                    try {
                        $kbStatus = $llmService->getKBStatus($this->projectId);
                        $kb->markAsReady([
                            'index_path' => $kbStatus['index_path'] ?? null,
                            'meta_path' => $kbStatus['meta_path'] ?? null,
                            'total_chunks' => $kbStatus['total_chunks'] ?? 0,
                        ]);
                    } catch (\Exception $e) {
                        $kb->markAsReady([]);
                    }
                }
                
                // Don't retry failed jobs
                $this->fail(new \Exception($status['error'] ?? 'Conflict detection failed'));
                return;
            }

            // Job is still pending or running - retry
            if (in_array($status['status'], ['pending', 'running'])) {
                Log::info('ProcessConflictDetectionJob: Still processing, will retry', [
                    'job_id' => $this->jobId,
                    'status' => $status['status'],
                    'progress' => $status['progress'] ?? null,
                    'attempt' => $this->attempts()
                ]);

                // Update progress based on status progress (60-85%)
                if ($kb && isset($status['progress'])) {
                    $progress = 60 + (int)($status['progress'] * 0.25); // Map 0-100 to 60-85
                    $kb->updateProgress($progress, 'processing_conflicts');
                }

                // Release the job back to the queue to retry
                $this->release($this->backoff);
                return;
            }

            // Unknown status
            Log::warning('ProcessConflictDetectionJob: Unknown status', [
                'job_id' => $this->jobId,
                'status' => $status['status'] ?? 'null'
            ]);
            
            $this->release($this->backoff);

        } catch (Throwable $e) {
            Log::error('ProcessConflictDetectionJob: Exception', [
                'job_id' => $this->jobId,
                'project_id' => $this->projectId,
                'error' => $e->getMessage(),
                'attempt' => $this->attempts()
            ]);

            // If we haven't exhausted retries, release back to queue
            if ($this->attempts() < $this->tries) {
                $this->release($this->backoff);
            } else {
                // Exhausted retries, fail the job but mark KB as ready
                $kb = \App\Models\KnowledgeBase::where('project_id', $this->projectId)->first();
                if ($kb && $kb->status === 'building') {
                    $llmService = app(\App\Services\LLMService::class);
                    try {
                        $kbStatus = $llmService->getKBStatus($this->projectId);
                        $kb->markAsReady([
                            'index_path' => $kbStatus['index_path'] ?? null,
                            'meta_path' => $kbStatus['meta_path'] ?? null,
                            'total_chunks' => $kbStatus['total_chunks'] ?? 0,
                        ]);
                    } catch (\Exception $ex) {
                        $kb->markAsReady([]);
                    }
                }
                $this->fail($e);
            }
        }
    }

    public function failed(Throwable $exception): void
    {
        Log::error('ProcessConflictDetectionJob: Job failed permanently', [
            'job_id' => $this->jobId,
            'project_id' => $this->projectId,
            'error' => $exception->getMessage()
        ]);
    }
}
