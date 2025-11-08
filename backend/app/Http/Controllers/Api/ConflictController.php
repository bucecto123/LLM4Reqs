<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ConflictDetectionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ConflictController extends Controller
{
    protected $conflictService;

    public function __construct(ConflictDetectionService $conflictService)
    {
        $this->conflictService = $conflictService;
    }

    /**
     * Start conflict detection for a project.
     *
     * POST /api/projects/{projectId}/conflicts/detect
     */
    public function detectConflicts(int $projectId)
    {
        try {
            $result = $this->conflictService->detectConflictsForProject($projectId);
            
            return response()->json([
                'success' => true,
                'job_id' => $result['job_id'],
                'status' => $result['status'],
                'message' => $result['message']
            ]);

        } catch (\Exception $e) {
            Log::error("Conflict detection failed", [
                'project_id' => $projectId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Conflict detection failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get status of a conflict detection job.
     *
     * GET /api/conflicts/status/{jobId}
     */
    public function getJobStatus(string $jobId)
    {
        try {
            $status = $this->conflictService->getJobStatus($jobId);
            
            return response()->json([
                'success' => true,
                'data' => $status
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get job status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process completed conflict detection job.
     *
     * POST /api/conflicts/process/{jobId}
     */
    public function processJob(Request $request, string $jobId)
    {
        $projectId = $request->input('project_id');

        if (!$projectId) {
            return response()->json([
                'success' => false,
                'message' => 'project_id is required'
            ], 400);
        }

        try {
            // Get job status
            $status = $this->conflictService->getJobStatus($jobId);

            if ($status['status'] !== 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Job is not completed yet',
                    'status' => $status['status']
                ], 400);
            }

            // Save conflicts
            $conflicts = $status['conflicts'] ?? [];
            $saved = $this->conflictService->saveConflicts($projectId, $conflicts);

            return response()->json([
                'success' => true,
                'conflicts_found' => count($conflicts),
                'conflicts_saved' => $saved,
                'metadata' => $status['metadata'] ?? null
            ]);

        } catch (\Exception $e) {
            Log::error("Failed to process conflict job", [
                'job_id' => $jobId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process job: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all conflicts for a project.
     *
     * GET /api/projects/{projectId}/conflicts
     */
    public function getProjectConflicts(int $projectId)
    {
        try {
            $conflicts = $this->conflictService->getProjectConflicts($projectId);
            
            return response()->json([
                'success' => true,
                'data' => $conflicts,
                'total' => $conflicts->count()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get conflicts: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Resolve a conflict.
     *
     * PUT /api/conflicts/{conflictId}/resolve
     */
    public function resolveConflict(Request $request, int $conflictId)
    {
        $request->validate([
            'resolution_notes' => 'required|string'
        ]);

        try {
            $conflict = $this->conflictService->resolveConflict(
                $conflictId,
                $request->input('resolution_notes')
            );

            return response()->json([
                'success' => true,
                'data' => $conflict,
                'message' => 'Conflict resolved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to resolve conflict: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a conflict.
     *
     * DELETE /api/conflicts/{conflictId}
     */
    public function deleteConflict(int $conflictId)
    {
        try {
            $conflict = \App\Models\RequirementConflict::findOrFail($conflictId);
            $conflict->delete();

            return response()->json([
                'success' => true,
                'message' => 'Conflict deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete conflict: ' . $e->getMessage()
            ], 500);
        }
    }
}
