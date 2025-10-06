<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    public function chat(Request $request)
    {
        $request->validate(['text' => 'required|string']);

        $llmUrl = env('LLM_URL', 'http://127.0.0.1:8000/extract');

        try {
            $resp = Http::post($llmUrl, [
                'text' => $request->input('text'),
            ]);

            return response()->json($resp->json(), $resp->status());
        } catch (\Exception $e) {
            return response()->json(['error' => 'LLM service unreachable', 'message' => $e->getMessage()], 500);
        }
    }
}
