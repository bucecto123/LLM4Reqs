<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    public function chat(Request $request)
    {
        $request->validate([
            'text' => 'required|string',
            'project_id' => 'nullable|int',
        ]);

        $query = $request->input('text');
        $projectId = $request->input('project_id');

        try {
            if ($projectId) {
                // Use KB query for project context
                $results = app(\App\Services\LLMService::class)->queryKB($projectId, $query);
                return response()->json($results);
            } else {
                // Fallback to extract
                $llmUrl = env('LLM_URL', 'http://127.0.0.1:8000/extract');
                $resp = Http::post($llmUrl, [
                    'text' => $query,
                ]);
                return response()->json($resp->json(), $resp->status());
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'LLM service unreachable', 'message' => $e->getMessage()], 500);
        }
    }
}
