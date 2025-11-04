<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\KBBuildJob;
use App\Models\KnowledgeBase;
use App\Models\Project;
use App\Services\LLMService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ProjectKBController extends Controller
{
    protected $llmService;

    public function __construct(LLMService $llmService)
    {
        $this->llmService = $llmService;
    }

    /**
     * Get KB status for a project.
     * GET /api/projects/{id}/kb/status
     */
    public function getStatus(int $projectId)
    {
        $project = Project::findOrFail($projectId);
        
        // Get or create KB record
        $kb = KnowledgeBase::firstOrCreate(
            ['project_id' => $project->id],
            ['status' => 'not_built']
        );

        // Check for stale builds (building for more than 10 minutes)
        if ($kb->status === 'building') {
            $lastUpdate = $kb->updated_at;
            if ($lastUpdate && $lastUpdate->diffInMinutes(now()) > 10) {
                Log::warning('KB build appears stale, marking as failed', [
                    'project_id' => $projectId,
                    'last_update' => $lastUpdate
                ]);
                $kb->markAsFailed('Build timeout - exceeded 10 minutes');
            }
        }

        // If KB is ready, get fresh status from LLM service
        if ($kb->isReady()) {
            try {
                $llmStatus = $this->llmService->getKBStatus($project->id);
                
                // Update local KB record if LLM service has different info
                if (isset($llmStatus['version'])) {
                    $kb->update([
                        'version' => $llmStatus['version'],
                        'documents_count' => $llmStatus['total_chunks'] ?? $kb->documents_count,
                    ]);
                }
            } catch (\Exception $e) {
                Log::warning('Failed to get LLM KB status', ['error' => $e->getMessage()]);
            }
        }

        return response()->json([
            'success' => true,
            'kb' => [
                'project_id' => $kb->project_id,
                'status' => $kb->status,
                'version' => $kb->version,
                'documents_count' => $kb->documents_count,
                'last_built_at' => $kb->last_built_at?->toIso8601String(),
                'last_error' => $kb->last_error,
                'is_ready' => $kb->isReady(),
                'build_progress' => $kb->build_progress ?? 0,
                'build_stage' => $kb->build_stage ?? 'not_started',
            ],
        ]);
    }

    /**
     * Enqueue a knowledge base build for the project.
     * POST /api/projects/{id}/kb/build
     */
    public function build(Request $request, int $projectId)
    {
        $project = Project::findOrFail($projectId);

        // Get or create KB record
        $kb = KnowledgeBase::firstOrCreate(
            ['project_id' => $project->id],
            ['status' => 'not_built']
        );

        // Check if already building
        if ($kb->status === 'building') {
            // Check if build is stale (older than 10 minutes)
            $lastUpdate = $kb->updated_at;
            if ($lastUpdate && $lastUpdate->diffInMinutes(now()) > 10) {
                Log::warning('KB build appears stale, resetting', [
                    'project_id' => $projectId,
                    'last_update' => $lastUpdate
                ]);
                // Reset the status to allow new build
                $kb->update([
                    'status' => 'failed',
                    'last_error' => 'Previous build timeout',
                    'job_id' => null
                ]);
            } else {
                // Build is actively running
                return response()->json([
                    'success' => false,
                    'message' => 'Knowledge base is already building. Please wait.',
                    'job_id' => $kb->job_id,
                    'started_at' => $kb->updated_at?->toIso8601String(),
                ], 409);
            }
        }

        // Dispatch the job
        $job = new KBBuildJob($project->id);
        $pendingDispatch = dispatch($job);
        $jobId = $pendingDispatch->id ?? $job->uniqueId();

        // Update KB status
        $kb->markAsBuilding($jobId);

        Log::info('KB build queued', [
            'project_id' => $project->id,
            'job_id' => $jobId
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Knowledge base build queued',
            'job_id' => $jobId,
            'project_id' => $project->id,
        ], 202);
    }

    /**
     * Reindex selected documents incrementally.
     * POST /api/projects/{id}/kb/reindex
     */
    public function reindex(Request $request, int $projectId)
    {
        $request->validate([
            'document_ids' => 'array',
            'document_ids.*' => 'integer|exists:documents,id',
        ]);

        $project = Project::findOrFail($projectId);
        
        // Get KB record
        $kb = KnowledgeBase::where('project_id', $project->id)->first();

        if (!$kb || !$kb->isReady()) {
            return response()->json([
                'success' => false,
                'message' => 'Knowledge base must be built before reindexing. Use /kb/build first.',
            ], 400);
        }

        // Get documents to reindex
        $documents = $project->documents()
            ->when($request->has('document_ids'), function ($query) use ($request) {
                return $query->whereIn('id', $request->document_ids);
            })
            ->get();

        if ($documents->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No documents found to reindex',
            ], 400);
        }

        // Prepare documents for LLM service
        $documentsPayload = $documents->map(function ($doc) {
            return [
                'content' => $doc->content ?? '',
                'type' => $doc->type ?? 'document',
                'meta' => [
                    'document_id' => $doc->id,
                    'filename' => $doc->original_filename,
                    'uploaded_at' => $doc->created_at->toIso8601String(),
                ],
            ];
        })->toArray();

        try {
            // Call LLM service for incremental update
            $result = $this->llmService->incrementalKBUpdate($project->id, $documentsPayload);

            // Update KB record
            $kb->update([
                'version' => $result['new_version'] ?? ($kb->version + 1),
                'documents_count' => $result['total_chunks'] ?? $kb->documents_count,
                'last_built_at' => now(),
            ]);

            Log::info('KB reindex completed', [
                'project_id' => $project->id,
                'documents_count' => count($documents)
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Documents reindexed successfully',
                'added_chunks' => $result['added_chunks'] ?? 0,
                'total_chunks' => $result['total_chunks'] ?? 0,
                'new_version' => $result['new_version'] ?? $kb->version,
            ]);
        } catch (\Exception $e) {
            Log::error('KB reindex failed', [
                'project_id' => $project->id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to reindex documents: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reset KB status to allow rebuilding.
     * POST /api/projects/{id}/kb/reset
     */
    public function reset(int $projectId)
    {
        $project = Project::findOrFail($projectId);
        
        $kb = KnowledgeBase::where('project_id', $project->id)->first();
        
        if (!$kb) {
            return response()->json([
                'success' => false,
                'message' => 'No knowledge base found for this project',
            ], 404);
        }

        // Store previous status for logging
        $previousStatus = $kb->status;
        
        $kb->update([
            'status' => 'not_built',
            'job_id' => null,
            'last_error' => null,
        ]);

        Log::info('KB status reset', [
            'project_id' => $projectId,
            'previous_status' => $previousStatus
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'KB status reset successfully',
            'previous_status' => $previousStatus,
        ]);
    }

    /**
     * Force rebuild KB (reset and rebuild in one action).
     * POST /api/projects/{id}/kb/force-rebuild
     */
    public function forceRebuild(Request $request, int $projectId)
    {
        $project = Project::findOrFail($projectId);

        // Get or create KB record
        $kb = KnowledgeBase::firstOrCreate(
            ['project_id' => $project->id],
            ['status' => 'not_built']
        );

        // Force reset regardless of current status
        $kb->update([
            'status' => 'not_built',
            'job_id' => null,
            'last_error' => null,
        ]);

        Log::info('KB force rebuild initiated', ['project_id' => $projectId]);

        // Now trigger build
        $job = new KBBuildJob($project->id);
        $pendingDispatch = dispatch($job);
        $jobId = $pendingDispatch->id ?? $job->uniqueId();

        $kb->markAsBuilding($jobId);

        return response()->json([
            'success' => true,
            'message' => 'Knowledge base force rebuild queued',
            'job_id' => $jobId,
            'project_id' => $project->id,
        ], 202);
    }
}