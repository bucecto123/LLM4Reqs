<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\LLMModel;

class LLMService
{
    private string $baseUrl;
    private string $apiKey;

    public function __construct()
    {
        $this->baseUrl = config('services.llm.url', 'http://localhost:8000');
        $this->apiKey = config('services.llm.api_key', 'dev-secret-key-12345');
    }

    /**
     * Get headers with API key authentication.
     */
    private function getHeaders(): array
    {
        return [
            'X-API-Key' => $this->apiKey,
            'Content-Type' => 'application/json',
        ];
    }

    /**
     * Time an HTTP call and log duration for both success and failure paths.
     * Throws on any non-2xx status (including 404) so callers handle it explicitly.
     *
     * @param  string        $methodName  e.g. "extractRequirements" used as log context
     * @param  string        $endpoint    e.g. "/api/extract"
     * @param  callable      $requestFn  must return an Illuminate\Http\Client\Response
     * @return array                     decoded JSON on 2xx
     * @throws \Exception                rethrows on failure (timing is still logged)
     */
    private function timedRequest(string $methodName, string $endpoint, callable $requestFn): array
    {
        $start = microtime(true);
        $response = $requestFn();
        $duration = round((microtime(true) - $start) * 1000, 2);

        if ($response->successful()) {
            Log::info("LLMService::{$methodName}", [
                'endpoint' => $endpoint,
                'duration_ms' => $duration,
                'status' => $response->status(),
            ]);
            return $response->json();
        }

        Log::error("LLMService::{$methodName}", [
            'endpoint' => $endpoint,
            'duration_ms' => $duration,
            'status' => $response->status(),
            'error' => $response->body(),
        ]);
        throw new \Exception("HTTP {$response->status()}: {$response->body()}");
    }

    /**
     * Extract requirements from text
     */
    public function extractRequirements(string $text, string $documentType = 'meeting_notes'): array
    {
        return $this->timedRequest('extractRequirements', "{$this->baseUrl}/api/extract", function () use ($text, $documentType) {
            return Http::withHeaders($this->getHeaders())
                ->timeout(90)
                ->post("{$this->baseUrl}/api/extract", [
                    'text' => $text,
                    'document_type' => $documentType,
                ]);
        });
    }

    /**
     * Chat with AI (with optional persona context)
     */
    public function chat(string $message, array $history = [], ?string $context = null, ?array $personaData = null, ?int $projectId = null): array
    {
        $payload = [
            'message' => $message,
            'conversation_history' => $history,
            'context' => $context,
        ];

        $modelId = $history['model_id'] ?? $personaData['model_id'] ?? null;
        $provider = $history['provider'] ?? $personaData['provider'] ?? null;
        if ($modelId) {
            $payload['model_id'] = $modelId;
            if (isset($history['model_id'])) {
                unset($history['model_id']);
                $payload['conversation_history'] = array_values($history);
            }
        }
        if ($provider) {
            $payload['provider'] = $provider;
            if (isset($history['provider'])) {
                unset($history['provider']);
                $payload['conversation_history'] = array_values($history);
            }
        }
        if ($projectId) {
            $payload['project_id'] = (string)$projectId;
        }
        if ($personaData) {
            $payload['persona_id'] = $personaData['id'] ?? null;
            $payload['persona_data'] = $personaData;
        }

        return $this->timedRequest('chat', "{$this->baseUrl}/api/chat", function () use ($payload) {
            return Http::withHeaders($this->getHeaders())
                ->timeout(60)
                ->post("{$this->baseUrl}/api/chat", $payload);
        });
    }

    /**
     * Chat with AI - returns full response immediately
     * Callback receives complete response in one chunk for instant display
     */
    public function chatStream(
        string $message,
        array $history = [],
        ?string $context = null,
        ?array $personaData = null,
        ?callable $onChunk = null,
        ?int $projectId = null
    ): array {
        $payload = [
            'message' => $message,
            'conversation_history' => $history,
            'context' => $context,
        ];

        $modelId = $history['model_id'] ?? $personaData['model_id'] ?? null;
        $provider = $history['provider'] ?? $personaData['provider'] ?? null;
        if ($modelId) {
            $payload['model_id'] = $modelId;
            if (isset($history['model_id'])) {
                unset($history['model_id']);
                $payload['conversation_history'] = array_values($history);
            }
        }
        if ($provider) {
            $payload['provider'] = $provider;
            if (isset($history['provider'])) {
                unset($history['provider']);
                $payload['conversation_history'] = array_values($history);
            }
        }
        if ($projectId) {
            $payload['project_id'] = (string)$projectId;
        }
        if ($personaData) {
            $payload['persona_id'] = $personaData['id'] ?? null;
            $payload['persona_data'] = $personaData;
        }

        $data = $this->timedRequest('chatStream', "{$this->baseUrl}/api/chat", function () use ($payload) {
            return Http::withHeaders($this->getHeaders())
                ->timeout(120)
                ->post("{$this->baseUrl}/api/chat", $payload);
        });

        // Deliver complete response in one chunk for instant display
        if ($onChunk && !empty($data['response'])) {
            $onChunk($data['response']);
        }

        return $data;
    }

    /**
     * Generate persona-specific view
     */
    public function generatePersonaView(string $requirementText, string $personaName, string $personaPrompt): array
    {
        return $this->timedRequest('generatePersonaView', "{$this->baseUrl}/api/persona/generate", function () use ($requirementText, $personaName, $personaPrompt) {
            return Http::timeout(60)->post("{$this->baseUrl}/api/persona/generate", [
                'requirement_text' => $requirementText,
                'persona_name' => $personaName,
                'persona_prompt' => $personaPrompt,
            ]);
        });
    }

    /**
     * Test connection to LLM service
     */
    public function testConnection(): bool
    {
        try {
            $this->timedRequest('testConnection', "{$this->baseUrl}/health", function () {
                return Http::timeout(10)->get("{$this->baseUrl}/health");
            });
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Request a full knowledge base build from the LLM service.
     * Expects the LLM service to accept a project_id and documents payload and return a job id or status.
     *
     * @param int $projectId
     * @param array $documents
     * @param string $mode 'async' or 'sync'
     * @return array
     * @throws \Exception
     */
    public function buildKnowledgeBase(int $projectId, array $documents, string $mode = 'async'): array
    {
        return $this->timedRequest('buildKnowledgeBase', "{$this->baseUrl}/kb/build", function () use ($projectId, $documents, $mode) {
            return Http::withHeaders($this->getHeaders())
                ->timeout(120)
                ->post("{$this->baseUrl}/kb/build", [
                    'project_id' => (string) $projectId,
                    'documents' => $documents,
                    'mode' => $mode,
                ]);
        });
    }

    /**
     * Query the knowledge base for relevant chunks.
     *
     * @param int $projectId
     * @param string $query
     * @param int $topK
     * @return array
     * @throws \Exception
     */
    public function queryKB(int $projectId, string $query, int $topK = 5): array
    {
        try {
            return $this->timedRequest('queryKB', "{$this->baseUrl}/kb/query", function () use ($projectId, $query, $topK) {
                return Http::withHeaders($this->getHeaders())
                    ->timeout(30)
                    ->post("{$this->baseUrl}/kb/query", [
                        'project_id' => (string) $projectId,
                        'query' => $query,
                        'top_k' => $topK,
                    ]);
            });
        } catch (\Exception $e) {
            // 404 = KB not built yet — return empty results gracefully
            if (str_contains($e->getMessage(), '404')) {
                return [
                    'project_id' => (string) $projectId,
                    'query' => $query,
                    'results' => [],
                    'scores' => [],
                    'total_results' => 0,
                ];
            }
            throw $e;
        }
    }

    /**
     * Get KB status from LLM service.
     *
     * @param int $projectId
     * @return array
     * @throws \Exception
     */
    public function getKBStatus(int $projectId): array
    {
        return $this->timedRequest('getKBStatus', "{$this->baseUrl}/kb/status/{$projectId}", function () use ($projectId) {
            return Http::withHeaders($this->getHeaders())
                ->timeout(10)
                ->get("{$this->baseUrl}/kb/status/{$projectId}");
        });
    }

    /**
     * Add documents incrementally to existing KB.
     *
     * @param int $projectId
     * @param array $documents
     * @return array
     * @throws \Exception
     */
    public function incrementalKBUpdate(int $projectId, array $documents): array
    {
        return $this->timedRequest('incrementalKBUpdate', "{$this->baseUrl}/kb/incremental", function () use ($projectId, $documents) {
            return Http::withHeaders($this->getHeaders())
                ->timeout(60)
                ->post("{$this->baseUrl}/kb/incremental", [
                    'project_id' => (string) $projectId,
                    'documents' => $documents,
                ]);
        });
    }

    /**
     * Remove documents from the KB for a project.
     *
     * @param int $projectId
     * @param array $filters
     * @return array
     * @throws \Exception
     */
    public function removeFromKB(int $projectId, array $filters): array
    {
        return $this->timedRequest('removeFromKB', "{$this->baseUrl}/kb/remove", function () use ($projectId, $filters) {
            return Http::withHeaders($this->getHeaders())
                ->timeout(30)
                ->post("{$this->baseUrl}/kb/remove", [
                    'project_id' => (string) $projectId,
                    'filters' => $filters,
                ]);
        });
    }

    /**
     * Get async job status from LLM service.
     *
     * @param string $jobId
     * @return array
     * @throws \Exception
     */
    public function getJobStatus(string $jobId): array
    {
        return $this->timedRequest('getJobStatus', "{$this->baseUrl}/kb/job/{$jobId}", function () use ($jobId) {
            return Http::withHeaders($this->getHeaders())
                ->timeout(10)
                ->get("{$this->baseUrl}/kb/job/{$jobId}");
        });
    }

    /**
     * Sync models from LLM service and update local database.
     * 
     * @return array
     */
    public function syncModels(): array
    {
        try {
            $models = $this->timedRequest('syncModels', "{$this->baseUrl}/models", function () {
                return Http::withHeaders($this->getHeaders())
                    ->timeout(30)
                    ->get("{$this->baseUrl}/models");
            });

            $synced = [];
            foreach ($models as $modelData) {
                $model = LLMModel::updateOrCreate(
                    ['model_id' => $modelData['model_id']],
                    [
                        'provider' => $modelData['provider'],
                        'name' => $modelData['name'] ?? $modelData['model_id'],
                        'is_active' => true,
                        'context_window' => $modelData['context_window'] ?? null,
                        'input_price' => $modelData['input_price'] ?? null,
                        'output_price' => $modelData['output_price'] ?? null,
                        'supports_tools' => $modelData['supports_tools'] ?? null,
                    ]
                );

                if (is_null($model->supports_tools)) {
                    $this->checkToolCapability($model);
                }

                $synced[] = $model->model_id;
            }

            return ['synced_count' => count($synced), 'models' => $synced];
        } catch (\Exception $e) {
            Log::error('Model sync failed', ['error' => $e->getMessage()]);
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Check tool capability for a model via Python service.
     */
    public function checkToolCapability(LLMModel $model): void
    {
        try {
            $result = $this->timedRequest('checkToolCapability', "{$this->baseUrl}/models/check-tools", function () use ($model) {
                return Http::withHeaders($this->getHeaders())
                    ->timeout(45)
                    ->post("{$this->baseUrl}/models/check-tools", [
                        'model_id' => $model->model_id,
                        'provider' => $model->provider,
                    ]);
            });
            $model->supports_tools = $result['supports_tools'] ?? false;
            $model->save();
        } catch (\Exception $e) {
            Log::warning("Failed to check tool capability for {$model->model_id}", ['error' => $e->getMessage()]);
        }
    }

    /**
     * Get available models from local DB.
     * 
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getAvailableModels()
    {
        return LLMModel::where('is_active', true)->orderBy('provider')->get();
    }
}