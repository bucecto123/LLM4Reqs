<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Project;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);

        if (!$request->user()->can('view', $project)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $perPage = min((int) $request->query('per_page', 20), 50);
        $logs = ActivityLog::where('project_id', $projectId)
            ->with('user:id,name,email')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json($logs);
    }

    public function log(
        int $projectId,
        ?int $userId,
        string $actionType,
        string $description,
        ?array $metadata = null
    ): void {
        ActivityLog::create([
            'project_id' => $projectId,
            'user_id' => $userId,
            'action_type' => $actionType,
            'description' => $description,
            'metadata' => $metadata,
            'created_at' => now(),
        ]);
    }
}
