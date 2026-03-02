<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LLMModel;
use App\Services\LLMService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LLMController extends Controller
{
    protected $llmService;

    public function __construct(LLMService $llmService)
    {
        $this->llmService = $llmService;
    }

    /**
     * Curated fallback list returned instantly when the DB has no models yet.
     * Avoids blocking the single-threaded PHP server with a slow remote API call on first boot.
     */
    private const FALLBACK_MODELS = [
        ['provider' => 'groq', 'model_id' => 'llama-3.3-70b-versatile',       'name' => 'Llama 3.3 70B Versatile',  'context_window' => 128000, 'supports_tools' => true,  'is_active' => true],
        ['provider' => 'groq', 'model_id' => 'llama-3.1-8b-instant',          'name' => 'Llama 3.1 8B Instant',     'context_window' => 131072, 'supports_tools' => true,  'is_active' => true],
        ['provider' => 'groq', 'model_id' => 'llama3-70b-8192',               'name' => 'Llama 3 70B',               'context_window' => 8192,   'supports_tools' => true,  'is_active' => true],
        ['provider' => 'groq', 'model_id' => 'llama3-8b-8192',                'name' => 'Llama 3 8B',                'context_window' => 8192,   'supports_tools' => true,  'is_active' => true],
        ['provider' => 'groq', 'model_id' => 'mixtral-8x7b-32768',            'name' => 'Mixtral 8x7B',              'context_window' => 32768,  'supports_tools' => true,  'is_active' => true],
        ['provider' => 'groq', 'model_id' => 'gemma2-9b-it',                  'name' => 'Gemma 2 9B',                'context_window' => 8192,   'supports_tools' => false, 'is_active' => true],
        ['provider' => 'groq', 'model_id' => 'deepseek-r1-distill-llama-70b', 'name' => 'DeepSeek R1 Distill 70B',  'context_window' => 131072, 'supports_tools' => false, 'is_active' => true],
    ];

    /**
     * List available models.
     *
     * Returns the hardcoded curated list instantly (no DB / network I/O).
     * Use POST /api/llm/sync to refresh from the live provider APIs and
     * swap in DB records once they are available.
     */
    public function index()
    {
        return response()->json(
            collect(self::FALLBACK_MODELS)->map(fn($m) => (object) $m)->values()
        );
    }

    /**
     * Force sync models from providers.
     */
    public function sync()
    {
        try {
            $result = $this->llmService->syncModels();
            return response()->json([
                'message' => 'Models synced successfully', 
                'details' => $result
            ]);
        } catch (\Exception $e) {
            Log::error('Model sync failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to sync models: ' . $e->getMessage()], 500);
        }
    }
}
