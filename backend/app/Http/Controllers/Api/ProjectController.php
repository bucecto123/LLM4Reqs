<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProjectRequest;
use App\Models\Project;
use App\Models\Requirement;
use App\Services\ProjectService;
use Illuminate\Support\Facades\Log;

class ProjectController extends Controller
{
    protected $project_service;

    public function __construct(ProjectService $project_service)
    {
        $this->project_service = $project_service;
    }

    public function index()
    {
        $projects = Project::all();
        return response()->json($projects);
    }

    public function store(ProjectRequest $request)
    {
        $new_user = $this->project_service->createProject($request->validated());
        return response()->json($new_user, 201);
    }

    public function show(string $id)
    {
        // Cache project data for 5 minutes to improve LCP
        $project = \Cache::remember("project_{$id}", 300, function () use ($id) {
            return Project::findOrFail($id);
        });
        
        return response()->json($project);
    }

    public function update(ProjectRequest $request, string $id)
    {
        $project = $this->project_service->updateProject($id, $request->validated());
        return response()->json($project, 200);
    }

    public function destroy(string $id)
    {
        $this->project_service->deleteProject($id);
        return response()->json(null, 204);
    }

    public function getRequirements(string $projectId)
    {
        try {
            // Find the project
            $project = Project::findOrFail($projectId);

            // Log project information
            Log::info('Project Information', [
                'project_id' => $project->id,
                'project_name' => $project->name
            ]);

            // Build the base query
            $query = Requirement::where('project_id', $project->id)->with('document');
            
            // Debug query
            Log::info('SQL Query Debug', [
                'raw_sql' => $query->toSql(),
                'bindings' => $query->getBindings(),
                'project_id' => $project->id,
                'all_requirements' => Requirement::count(),
                'project_requirements' => Requirement::where('project_id', $project->id)->count()
            ]);

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

            // Add withTrashed if requested
            if (request('with_trashed', false)) {
                $query->withTrashed();
            }

            // Sorting
            $orderBy = request('order_by', 'created_at');
            $orderDir = request('order_dir', 'desc');
            $query->orderBy($orderBy, $orderDir);

            // Get paginated results
            $perPage = request('per_page', 15);
            $requirements = $query->paginate($perPage);

            // Get counts
            $totalCount = $requirements->total();
            $activeCount = $query->withoutTrashed()->count();
            $deletedCount = $totalCount - $activeCount;

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
            ->with([
                'requirement1' => function($query) {
                    $query->select('id', 'title', 'requirement_text', 'requirement_type');
                },
                'requirement2' => function($query) {
                    $query->select('id', 'title', 'requirement_text', 'requirement_type');
                }
            ])
            ->when(request('severity'), function($query, $severity) {
                return $query->where('severity', $severity);
            })
            ->when(request('resolution_status'), function($query, $status) {
                return $query->where('resolution_status', $status);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(request('per_page', 15));
        
        return response()->json($conflicts);
    }

    public function getUserProjects($userId)
    {
        $projects = Project::where('owner_id', $userId)->get();
        return response()->json($projects);
    }
}