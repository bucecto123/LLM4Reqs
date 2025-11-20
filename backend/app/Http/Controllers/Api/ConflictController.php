<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ConflictDetectionService;
use App\Services\LLMService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ConflictController extends Controller
{
    protected $conflictService;
    protected $llmService;

    public function __construct(ConflictDetectionService $conflictService, LLMService $llmService)
    {
        $this->conflictService = $conflictService;
        $this->llmService = $llmService;
    }

    /**
     * Start conflict detection for a project.
     * POST /api/projects/{projectId}/conflicts/detect
     */
    public function detectConflicts(int $projectId)
    {
        try {
            $result = $this->conflictService->detectConflictsForProject($projectId);

            return response()->json([
                'success' => true,
                'job_id' => $result['job_id'] ?? null,
                'status' => $result['status'] ?? null,
                'message' => $result['message'] ?? null,
            ]);
        } catch (\Exception $e) {
            Log::error('Conflict detection failed', [
                'project_id' => $projectId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Conflict detection failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get status of a conflict detection job.
     * GET /api/conflicts/status/{jobId}
     */
    public function getJobStatus(string $jobId)
    {
        try {
            $status = $this->conflictService->getJobStatus($jobId);

            return response()->json([
                'success' => true,
                'data' => $status,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get job status: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Process completed conflict detection job.
     * POST /api/conflicts/process/{jobId}
     */
    public function processJob(Request $request, string $jobId)
    {
        $projectId = $request->input('project_id');

        if (!$projectId) {
            return response()->json([
                'success' => false,
                'message' => 'project_id is required',
            ], 400);
        }

        try {
            $status = $this->conflictService->getJobStatus($jobId);

            if (($status['status'] ?? null) !== 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Job is not completed yet',
                    'status' => $status['status'] ?? null,
                ], 400);
            }

            $conflicts = $status['conflicts'] ?? [];
            $saved = $this->conflictService->saveConflicts($projectId, $conflicts);

            return response()->json([
                'success' => true,
                'conflicts_found' => count($conflicts),
                'conflicts_saved' => $saved,
                'metadata' => $status['metadata'] ?? null,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to process conflict job', [
                'job_id' => $jobId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process job: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all conflicts for a project.
     * GET /api/projects/{projectId}/conflicts
     */
    public function getProjectConflicts(int $projectId)
    {
        try {
            $conflicts = $this->conflictService->getProjectConflicts($projectId);

            return response()->json([
                'success' => true,
                'data' => $conflicts,
                'total' => $conflicts->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get conflicts: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Resolve a single conflict automatically using AI.
     * POST /api/conflicts/{conflictId}/resolve-ai
     */
    public function resolveConflictWithAI(int $conflictId)
    {
        try {
            $conflict = \App\Models\RequirementConflict::findOrFail($conflictId);

            if ($conflict->resolution_status === 'resolved') {
                return response()->json([
                    'success' => false,
                    'message' => 'Conflict is already resolved',
                ], 400);
            }

            // Generate resolution using LLM
            $resolution = $this->conflictService->generateResolution($conflict);

            if (!$resolution) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to generate AI resolution',
                ], 500);
            }

            // Resolve the conflict
            $conflict = $this->conflictService->resolveConflict(
                $conflictId,
                $resolution['resolution_notes']
            );

            // Append resolution marker to KB
            try {
                if ($conflict && $conflict->requirement1) {
                    $projectId = $conflict->requirement1->project_id;
                    $resolvedDoc = [
                        'content' => "Conflict auto-resolved: {$conflict->id} - {$resolution['resolution_notes']}",
                        'type' => 'conflict_resolution',
                        'meta' => [
                            'conflict_id' => (string) $conflict->id,
                            'resolved' => true,
                            'auto_resolved' => true,
                            'project_id' => (string) $projectId,
                        ],
                    ];

                    try {
                        $res = $this->llmService->incrementalKBUpdate($projectId, [$resolvedDoc]);
                        $skipped = $res['skipped_chunks'] ?? $res['skipped'] ?? 0;
                        if ($skipped) {
                            Log::info('ConflictController: incrementalKBUpdate skipped duplicates on AI resolve', [
                                'project_id' => $projectId,
                                'skipped' => $skipped,
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::warning('Failed to append AI resolution marker to KB', [
                            'conflict_id' => $conflictId,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            } catch (\Exception $e) {
                Log::warning('Failed to append AI resolution marker to KB', [
                    'conflict_id' => $conflictId,
                    'error' => $e->getMessage(),
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $conflict,
                'message' => 'Conflict resolved successfully with AI',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to resolve conflict with AI: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Resolve a conflict and optionally append a resolution marker into the KB.
     * PUT /api/conflicts/{conflictId}/resolve
     */
    public function resolveConflict(Request $request, int $conflictId)
    {
        $request->validate([
            'resolution_notes' => 'required|string',
        ]);

        try {
            $conflict = $this->conflictService->resolveConflict(
                $conflictId,
                $request->input('resolution_notes')
            );

            // Append a small resolved marker to KB so searches reflect resolution state.
            try {
                if ($conflict && isset($conflict->project_id)) {
                    $resolvedDoc = [
                        'content' => "Conflict resolved: {$conflict->id} - {$request->input('resolution_notes')}",
                        'type' => 'conflict_resolution',
                        'meta' => [
                            'conflict_id' => (string) $conflict->id,
                            'resolved' => true,
                            'project_id' => (string) $conflict->project_id,
                        ],
                    ];

                    try {
                        $res = $this->llmService->incrementalKBUpdate($conflict->project_id, [$resolvedDoc]);
                        $skipped = $res['skipped_chunks'] ?? $res['skipped'] ?? 0;
                        if ($skipped) {
                            Log::info('ConflictController: incrementalKBUpdate skipped duplicates on resolve', [
                                'project_id' => $conflict->project_id,
                                'skipped' => $skipped,
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::warning('Failed to append conflict resolution marker to KB', [
                            'conflict_id' => $conflictId,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            } catch (\Exception $e) {
                Log::warning('Failed to append conflict resolution marker to KB', [
                    'conflict_id' => $conflictId,
                    'error' => $e->getMessage(),
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $conflict,
                'message' => 'Conflict resolved successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to resolve conflict: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Automatically resolve all pending conflicts for a project.
     * POST /api/projects/{projectId}/conflicts/auto-resolve
     */
    public function autoResolveConflicts(int $projectId)
    {
        try {
            $resolved = $this->conflictService->autoResolveConflicts($projectId, true);

            // Update KB with resolution markers for all auto-resolved conflicts
            if ($resolved > 0) {
                $resolvedConflicts = \App\Models\RequirementConflict::whereHas('requirement1', function ($q) use ($projectId) {
                    $q->where('project_id', $projectId);
                })
                ->where('resolution_status', 'resolved')
                ->whereNotNull('resolved_at')
                ->where('resolved_at', '>=', now()->subMinutes(5)) // Recently resolved
                ->get();

                foreach ($resolvedConflicts as $conflict) {
                    try {
                        $resolvedDoc = [
                            'content' => "Conflict auto-resolved: {$conflict->id} - {$conflict->resolution_notes}",
                            'type' => 'conflict_resolution',
                            'meta' => [
                                'conflict_id' => (string) $conflict->id,
                                'resolved' => true,
                                'auto_resolved' => true,
                                'project_id' => (string) $projectId,
                            ],
                        ];

                        $res = $this->llmService->incrementalKBUpdate($projectId, [$resolvedDoc]);
                        $skipped = $res['skipped_chunks'] ?? $res['skipped'] ?? 0;
                        if ($skipped) {
                            Log::info('ConflictController: incrementalKBUpdate skipped duplicates on auto-resolve', [
                                'project_id' => $projectId,
                                'conflict_id' => $conflict->id,
                                'skipped' => $skipped,
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::warning('Failed to append auto-resolution marker to KB', [
                            'conflict_id' => $conflict->id,
                            'project_id' => $projectId,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => "Auto-resolved {$resolved} conflict(s)",
                'resolved_count' => $resolved,
            ]);
        } catch (\Exception $e) {
            Log::error('Auto-resolve conflicts failed', [
                'project_id' => $projectId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Auto-resolve failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a conflict and request KB removal.
     * DELETE /api/conflicts/{conflictId}
     */
    public function deleteConflict(int $conflictId)
    {
        try {
            $conflict = \App\Models\RequirementConflict::findOrFail($conflictId);
            $projectId = $conflict->project_id;

            // Delete DB record first
            $conflict->delete();

            // Request KB removal for this conflict (non-blocking: log failures)
            try {
                $this->llmService->removeFromKB($projectId, [
                    'meta_conflict_ids' => [(string) $conflictId],
                ]);
            } catch (\Exception $e) {
                Log::warning('Failed to remove conflict from KB after delete', [
                    'conflict_id' => $conflictId,
                    'project_id' => $projectId,
                    'error' => $e->getMessage(),
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Conflict deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete conflict: ' . $e->getMessage(),
            ], 500);
        }
    }
}
