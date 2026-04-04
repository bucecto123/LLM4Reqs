<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProjectRequest;
use App\Models\Document;
use App\Models\Project;
use App\Models\Requirement;
use App\Services\ProjectService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ProjectController extends Controller
{
    protected $project_service;

    public function __construct(ProjectService $project_service)
    {
        $this->project_service = $project_service;
    }

    public function index(\Illuminate\Http\Request $request)
    {
        $userId = $request->user()->id;
        Log::info('ProjectController@index: Starting', ['user_id' => $userId]);

        // Short-lived cache per user to avoid N+1 on repeated page loads
        $cacheKey = "user_projects_list_{$userId}";
        $projects = Cache::remember($cacheKey, 30, function () use ($userId) {
            // Get projects owned by user OR where user is a collaborator
            // Eager load the specific collaborator record for the current user to avoid N+1 queries loop
            return Project::where('owner_id', $userId)
                ->orWhereHas('collaborators', function ($query) use ($userId) {
                    $query->where('user_id', $userId);
                })
                ->with(['owner:id,name,email']) // Eager load owner details
                ->with(['collaborators' => function ($query) use ($userId) {
                    $query->where('user_id', $userId);
                }])
                // Count only non-deleted documents/requirements (withCount excludes soft-deleted by default)
                ->withCount(['documents'])
                ->withCount(['requirements'])
                ->select(['id', 'name', 'description', 'status', 'owner_id', 'created_at', 'updated_at'])
                ->orderBy('updated_at', 'desc')
                ->get();
        });

        Log::info('ProjectController@index: Projects retrieved: ' . $projects->count());

        // Bulk-load all max timestamps in 2 queries instead of 2*N queries
        $projectIds = $projects->pluck('id')->toArray();
        $docMaxes = $projectIds
            ? Document::whereIn('project_id', $projectIds)
                ->groupBy('project_id')
                ->selectRaw('project_id, MAX(created_at) as max_created')
                ->pluck('max_created', 'project_id')
            : collect();
        $reqMaxes = $projectIds
            ? Requirement::whereIn('project_id', $projectIds)
                ->groupBy('project_id')
                ->selectRaw('project_id, MAX(created_at) as max_created')
                ->pluck('max_created', 'project_id')
            : collect();

        $projects->each(function ($project) use ($docMaxes, $reqMaxes) {
            $project->last_activity = max(array_filter([
                $project->updated_at,
                $docMaxes[$project->id] ?? null,
                $reqMaxes[$project->id] ?? null,
            ]));
        });

        // Diagnostic logging — helps surface count mismatches in production
        Log::info('ProjectController@index: Count check', [
            'user_id' => $userId,
            'project_ids' => $projects->pluck('id')->toArray(),
            'counts' => $projects->map(fn($p) => [
                'id' => $p->id,
                'docs' => $p->documents_count,
                'reqs' => $p->requirements_count,
            ])->toArray(),
        ]);
        
        // Add permission/role attribute using the eager loaded relation
        $projects->transform(function ($project) use ($userId) {
            $project->role = $project->owner_id == $userId ? 'owner' : 'viewer'; // Default to viewer
            
            if ($project->owner_id != $userId) {
                // Check specific collaborator role from the eager loaded collection
                // Since we filtered in the query, the collection will only contain the current user's record if it exists
                $collaborator = $project->collaborators->first();
                if ($collaborator) {
                    $project->role = $collaborator->pivot->role ?? 'viewer';
                }
            }
            // Hide the collaborators relation from the final JSON
            $project->unsetRelation('collaborators');
            return $project;
        });
        
        return response(json_encode($projects), 200)
            ->header('Content-Type', 'application/json');
    }

    public function store(ProjectRequest $request)
    {
        $project = $this->project_service->createProject($request->validated());

        // Bust the user's project-list cache so counts are fresh on next load
        Cache::forget("user_projects_list_" . auth()->id());

        // Add role attribute (creator is always owner)
        $project->role = 'owner';

        return response(json_encode($project), 201)
            ->header('Content-Type', 'application/json');
    }

    public function show(\Illuminate\Http\Request $request, string $id)
    {
        $userId = $request->user()->id;

        // Cache project + role together (scoped per user) for 5 minutes
        $cacheKey = "project_{$id}_user_{$userId}";
        $project = \Cache::remember($cacheKey, 300, function () use ($id, $userId) {
            $p = Project::with('owner:id,name,email')->findOrFail($id);
            // Resolve and store the role inside the cache so no extra query runs later
            if ($p->owner_id == $userId) {
                $p->role = 'owner';
            } else {
                $collaborator = $p->collaborators()->where('user_id', $userId)->first();
                $p->role = $collaborator ? ($collaborator->pivot->role ?? 'viewer') : 'viewer';
            }
            return $p;
        });

        // Check authorization
        if (!$request->user()->can('view', $project)) {
            return response()->json([
                'message' => 'Unauthorized to view this project'
            ], 403);
        }
        
        return response(json_encode($project), 200)
            ->header('Content-Type', 'application/json');
    }

    public function update(ProjectRequest $request, string $id)
    {
        $project = Project::findOrFail($id);
        
        // Check authorization
        if (!$request->user()->can('update', $project)) {
            return response()->json([
                'message' => 'Unauthorized to update this project'
            ], 403);
        }
        
        $project = $this->project_service->updateProject($id, $request->validated());

        // Bust both the single-project cache and the project-list cache
        Cache::forget("project_{$id}_user_{$request->user()->id}");
        Cache::forget("user_projects_list_{$request->user()->id}");
        
        return response(json_encode($project), 200)
            ->header('Content-Type', 'application/json');
    }

    public function destroy(\Illuminate\Http\Request $request, string $id)
    {
        $project = Project::findOrFail($id);
        
        // Check authorization
        if (!$request->user()->can('delete', $project)) {
            return response()->json([
                'message' => 'Unauthorized to delete this project'
            ], 403);
        }
        
        // Bust cache before deleting
        Cache::forget("project_{$id}_user_{$request->user()->id}");
        Cache::forget("user_projects_list_{$request->user()->id}");

        $this->project_service->deleteProject($id);
        return response()->json(null, 204);
    }

    public function getRequirements(\Illuminate\Http\Request $request, string $projectId)
    {
        try {
            // Find the project
            $project = Project::findOrFail($projectId);

            // Check authorization
            if (!$request->user()->can('viewResources', $project)) {
                return response()->json([
                    'message' => 'Unauthorized to view project requirements'
                ], 403);
            }

            // Log project information
            Log::info('Project Information', [
                'project_id' => $project->id,
                'project_name' => $project->name
            ]);

            // Build the base query
            $query = Requirement::where('project_id', $project->id)->with('document');

            // Apply filters only if they have non-empty values
            if (request()->filled('type')) {
                $query->where('requirement_type', request('type'));
            }
            
            if (request()->filled('priority')) {
                $query->where('priority', request('priority'));
            }
            
            if (request()->filled('status')) {
                $query->where('status', request('status'));
            }            // Apply search
            if (request()->has('search')) {
                $search = request('search');
                $query->where(function($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('requirement_text', 'like', "%{$search}%");
                });
            }

            // Sorting
            $orderBy = request('order_by', 'requirement_number');
            $orderDir = request('order_dir', 'asc');
            $query->orderBy($orderBy, $orderDir);

            // Get paginated results
            $perPage = request('per_page', 15);
            $requirements = $query->paginate($perPage);

            // Get counts
            $totalCount = $requirements->total();
            $activeCount = $totalCount;
            $deletedCount = 0;

            // Log the results
            Log::info('Requirements Query Results', [
                'total_count' => $totalCount,
                'active_count' => $activeCount,
                'deleted_count' => $deletedCount,
                'current_page' => $requirements->currentPage(),
                'per_page' => $requirements->perPage()
            ]);

            // Prepare response
            $response = [
                'success' => true,
                'data' => $requirements->items(),
                'total' => $totalCount,
                'per_page' => $requirements->perPage(),
                'current_page' => $requirements->currentPage(),
                'last_page' => $requirements->lastPage(),
                'meta' => [
                    'active_count' => $activeCount,
                    'deleted_count' => $deletedCount
                ]
            ];

            return response()->json($response);

        } catch (\Exception $e) {
            Log::error('Error in getRequirements', [
                'project_id' => $projectId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch requirements: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getConflicts(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        
        $conflicts = $project->requirementConflicts()
            // Only show conflicts where both requirements exist (not soft-deleted)
            ->whereHas('requirement1')
            ->whereHas('requirement2')
            ->with([
                'requirement1' => function($query) {
                    $query->select('id', 'requirement_number', 'title', 'requirement_text', 'requirement_type');
                },
                'requirement2' => function($query) {
                    $query->select('id', 'requirement_number', 'title', 'requirement_text', 'requirement_type');
                }
            ])
            ->when(request('severity'), function($query, $severity) {
                return $query->where('severity', $severity);
            })
            ->when(request('resolution_status'), function($query, $status) {
                return $query->where('resolution_status', $status);
            })
            ->orderBy('conflict_number', 'asc')
            ->orderBy('created_at', 'desc')
            ->paginate(request('per_page', 15));
        
        return response()->json($conflicts);
    }

    public function getUserProjects($userId)
    {
        $projects = Project::where('owner_id', $userId)->get();
        return response()->json($projects);
    }

    public function dashboard(\Illuminate\Http\Request $request, string $id)
    {
        $project = \App\Models\Project::findOrFail($id);

        if (!$request->user()->can('view', $project)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $projectId = $project->id;

        // Compute metrics
        $docCount = \App\Models\Document::where('project_id', $projectId)->count();
        $reqCount = \App\Models\Requirement::where('project_id', $projectId)->count();
        $approvedReqCount = \App\Models\Requirement::where('project_id', $projectId)
            ->where('status', 'approved')->count();

        $unresolvedConflicts = \App\Models\RequirementConflict::
            where('project_id', $projectId)
            ->whereNotIn('status', ['resolved', 'resolved_by_ai', 'resolved_manual'])
            ->count();
        $resolvedConflicts = \App\Models\RequirementConflict::
            where('project_id', $projectId)
            ->whereIn('status', ['resolved', 'resolved_by_ai', 'resolved_manual'])
            ->count();

        $collaboratorCount = \App\Models\ProjectCollaborator::where('project_id', $projectId)->count();

        $completionPct = $reqCount > 0 ? round(($approvedReqCount / $reqCount) * 100, 1) : 0;

        $lastDoc = \App\Models\Document::where('project_id', $projectId)->max('created_at');
        $lastReq = \App\Models\Requirement::where('project_id', $projectId)->max('created_at');
        $lastActivity = max(array_filter([$project->updated_at, $lastDoc, $lastReq]));

        return response()->json([
            'document_count' => $docCount,
            'requirement_count' => $reqCount,
            'approved_requirement_count' => $approvedReqCount,
            'completion_pct' => $completionPct,
            'unresolved_conflicts' => $unresolvedConflicts,
            'resolved_conflicts' => $resolvedConflicts,
            'collaborator_count' => $collaboratorCount,
            'last_activity' => $lastActivity,
        ]);
    }

    /**
     * Export requirements as CSV.
     * GET /api/projects/{id}/requirements/export
     */
    public function exportRequirements(\Illuminate\Http\Request $request, string $id)
    {
        $project = \App\Models\Project::findOrFail($id);

        if (!$request->user()->can('viewResources', $project)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $requirements = \App\Models\Requirement::where('project_id', $project->id)
            ->orderBy('requirement_number')
            ->get(['requirement_number', 'title', 'requirement_text', 'requirement_type', 'priority', 'status']);

        $csv = fopen('php://temp', 'r+');
        fputcsv($csv, ['requirement_number', 'title', 'requirement_text', 'requirement_type', 'priority', 'status']);

        foreach ($requirements as $req) {
            fputcsv($csv, [
                $req->requirement_number,
                $req->title,
                $req->requirement_text,
                $req->requirement_type,
                $req->priority,
                $req->status,
            ]);
        }

        rewind($csv);
        $content = stream_get_contents($csv);
        fclose($csv);

        $filename = preg_replace('/[^a-z0-9_\-]/i', '_', $project->name) . '_requirements.csv';

        return response($content, 200)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");
    }

    /**
     * Import requirements from CSV.
     * POST /api/projects/{id}/requirements/import
     */
    public function importRequirements(\Illuminate\Http\Request $request, string $id)
    {
        $project = \App\Models\Project::findOrFail($id);

        if (!$request->user()->can('modifyResources', $project)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!$request->hasFile('file')) {
            return response()->json(['message' => 'No file uploaded'], 400);
        }

        $file = $request->file('file');
        if (!in_array($file->getClientOriginalExtension(), ['csv', 'txt'])) {
            return response()->json(['message' => 'Only CSV files are supported'], 400);
        }

        $handle = fopen($file->getRealPath(), 'r');
        $rows = [];
        $header = null;
        $lineNum = 0;

        while (($data = fgetcsv($handle)) !== false) {
            if ($lineNum === 0) {
                $header = array_map('strtolower', array_map('trim', $data));
                $lineNum++;
                continue;
            }
            $row = array_combine($header, $data);
            if ($row) {
                $rows[] = $row;
            }
            $lineNum++;
        }
        fclose($handle);

        if (empty($rows)) {
            return response()->json(['message' => 'CSV file is empty or invalid'], 400);
        }

        $service = app(\App\Services\RequirementImportService::class);
        $result = $service->import($project->id, $rows);

        return response()->json([
            'success' => true,
            'imported' => $result['imported'],
            'skipped' => $result['skipped'],
            'errors' => $result['errors'],
        ]);
    }
}