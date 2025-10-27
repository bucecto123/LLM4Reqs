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

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $projects = Project::all();
        return response()->json($projects);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(ProjectRequest $request)
    {
        $new_user = $this->project_service->createProject($request->validated());
        return response()->json($new_user, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $project = Project::findOrFail($id);
        return response()->json($project);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(ProjectRequest $request, string $id)
    {
        $project = $this->project_service->updateProject($id, $request->validated());
        return response()->json($project, 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $this->project_service->deleteProject($id);
        return response()->json(null, 204);
    }

    public function getRequirements(string $projectId)
    {
        try {
            // First verify the project exists
            $project = Project::findOrFail($projectId);
            
            // Debug project and requirements existence
            Log::info('Project and Requirements Check', [
                'project_id' => $project->id,
                'project_name' => $project->name,
                'direct_requirements_count' => Requirement::where('project_id', $project->id)->count(),
                'relationship_requirements_count' => $project->requirements()->count(),
                'has_requirements_relation' => method_exists($project, 'requirements'),
            ]);
            
            // Start building the query
            $query = Requirement::where('project_id', $project->id)
                              ->with('document');
            
            // Log the initial query state
            Log::info('Initial Requirements Query', [
                'sql' => $query->toSql(),
                'bindings' => $query->getBindings(),
                'count' => $query->count(),
                'raw_results' => $query->get(['id', 'title', 'requirement_type'])->toArray()
            ]);
        
            // Apply filters if provided
            if (request()->has('type')) {
                $query->where('requirement_type', request('type'));
            }
            
            if (request()->has('priority')) {
                $query->where('priority', request('priority'));
            }
            
            if (request()->has('status')) {
                $query->where('status', request('status'));
            }
            
            // Search by text
            if (request()->has('search')) {
                $search = request('search');
                $query->where(function($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('requirement_text', 'like', "%{$search}%");
                });
            }
            
            // Debug after filters
            Log::info('After applying filters', [
                'sql' => $query->toSql(),
                'bindings' => $query->getBindings(),
                'count' => $query->count()
            ]);
            
            // Order by
            $orderBy = request('order_by', 'created_at');
            $orderDir = request('order_dir', 'desc');
            $query->orderBy($orderBy, $orderDir);

            // Check for and include soft deleted items if requested
            if (request('with_trashed', false)) {
                $query->withTrashed();
            }
            
            // Get paginated results
            $perPage = request('per_page', 15);
            $requirements = $query->paginate($perPage);
            
            // Get final counts for active and deleted items
            $totalCount = $requirements->total();
            $activeCount = $query->withoutTrashed()->count();
            $deletedCount = $totalCount - $activeCount;
            
            Log::info('Final counts', [
                'project_id' => $projectId,
                'total_count' => $totalCount,
                'active_count' => $activeCount,
                'deleted_count' => $deletedCount,
                'items_in_page' => count($requirements->items())
            ]);
            
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
            
            Log::info('Sending response', [
                'data_count' => count($response['data']),
                'total' => $response['total']
            ]);
            
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

    /**
     * Get requirement conflicts for a project.
     * GET /api/projects/{id}/conflicts
     */
    public function getConflicts(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        
        // Get conflicts with related requirements
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