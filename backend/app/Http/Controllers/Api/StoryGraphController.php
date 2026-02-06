<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class StoryGraphController extends Controller
{
    /**
     * Generate user story graph for a project
     */
    public function generate(Request $request, $projectId)
    {
        $project = Project::findOrFail($projectId);
        
        // Check authorization
        if (!$request->user()->can('view', $project)) {
            return response()->json([
                'message' => 'Unauthorized to view project'
            ], 403);
        }

        // Check if we have a cached graph (optional caching)
        $cacheKey = "story_graph_{$projectId}";
        $cacheDuration = 3600; // 1 hour
        
        if ($request->query('use_cache', true) && Cache::has($cacheKey)) {
            Log::info("Returning cached story graph for project {$projectId}");
            return response()->json([
                'cached' => true,
                'graph' => Cache::get($cacheKey)
            ]);
        }

        // Load requirements with relationships
        $requirements = $project->requirements()
            ->with(['document', 'personas'])
            ->get();

        if ($requirements->isEmpty()) {
            return response()->json([
                'message' => 'No requirements found for this project',
                'graph' => null
            ], 200);
        }

        // Prepare data for LLM service
        $requirementsData = $requirements->map(function ($req) {
            return [
                'id' => $req->id,
                'title' => $req->title,
                'text' => $req->requirement_text,
                'type' => $req->requirement_type,
                'priority' => $req->priority,
                'status' => $req->status,
                'personas' => $req->personas->pluck('name')->toArray()
            ];
        });

        try {
            // Call LLM service to generate story graph
            $llmServiceUrl = env('LLM_SERVICE_URL', 'http://llm:8000');
            
            Log::info("Requesting story graph from LLM service", [
                'project_id' => $projectId,
                'requirements_count' => $requirements->count()
            ]);

            $response = Http::timeout(60)->post("{$llmServiceUrl}/api/story-graph/generate", [
                'project_id' => $projectId,
                'project_name' => $project->name,
                'requirements' => $requirementsData
            ]);

            if (!$response->successful()) {
                Log::error("LLM service error", [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                
                return response()->json([
                    'message' => 'Failed to generate story graph',
                    'error' => $response->json()['error'] ?? 'Unknown error'
                ], $response->status());
            }

            $graphData = $response->json();
            
            // Cache the result
            Cache::put($cacheKey, $graphData, $cacheDuration);

            Log::info("Story graph generated successfully for project {$projectId}");

            return response()->json([
                'cached' => false,
                'graph' => $graphData
            ]);

        } catch (\Exception $e) {
            Log::error("Error generating story graph", [
                'project_id' => $projectId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Failed to generate story graph',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Clear cached story graph for a project
     */
    public function clearCache(Request $request, $projectId)
    {
        $project = Project::findOrFail($projectId);
        
        // Check authorization (editors and owners can clear cache)
        if (!$request->user()->can('update', $project)) {
            return response()->json([
                'message' => 'Unauthorized to clear cache'
            ], 403);
        }

        $cacheKey = "story_graph_{$projectId}";
        Cache::forget($cacheKey);

        return response()->json([
            'message' => 'Story graph cache cleared successfully'
        ]);
    }
}
