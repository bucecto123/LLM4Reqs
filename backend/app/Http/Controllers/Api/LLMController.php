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
     * List available models.
     */
    public function index()
    {
        // First try to serve from DB
        $models = LLMModel::where('is_active', true)->orderBy('provider')->orderBy('name')->get();

        // Group by support tool capability for Frontend convenience? 
        // Or just return flat list and let frontend handle it.
        // Let's return flat list but ensuring fields are present.

        if ($models->isEmpty()) {
            // If no models in DB, try to sync synchronously
            try {
                $this->llmService->syncModels();
                $models = LLMModel::where('is_active', true)->orderBy('provider')->orderBy('name')->get();
            } catch (\Exception $e) {
                Log::error('Failed to auto-sync models on index', ['error' => $e->getMessage()]);
            }
        }

        return response()->json($models);
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
