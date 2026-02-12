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
     * Extract requirements from text
     */
    public function extractRequirements(string $text, string $documentType = 'meeting_notes'): array
    {
        try {
            $response = Http::withHeaders($this->getHeaders())
                ->timeout(90)
                ->post("{$this->baseUrl}/api/extract", [
                    'text' => $text,
                    'document_type' => $documentType,
                ]);

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('LLM API failed: ' . $response->body());
        } catch (\Exception $e) {
            Log::error('LLM extraction failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Chat with AI (with optional persona context)
     */
    public function chat(string $message, array $history = [], ?string $context = null, ?array $personaData = null, ?int $projectId = null): array
    {
        try {
            $payload = [
                'message' => $message,
                'conversation_history' => $history,
                'context' => $context,
            ];

            // Extract model_id from history or personaData if present
            $modelId = $history['model_id'] ?? $personaData['model_id'] ?? null;
            if ($modelId) {
                $payload['model_id'] = $modelId;
                // Remove from history if it was passed there
                if (isset($history['model_id'])) {
                    unset($history['model_id']);
                    $payload['conversation_history'] = array_values($history); // Re-index array
                }
            }
            
            if ($projectId) {
                $payload['project_id'] = (string)$projectId;
            }
            
            // Add persona data if provided
            if ($personaData) {
                $payload['persona_id'] = $personaData['id'] ?? null;
                $payload['persona_data'] = $personaData;
            }
            
            $response = Http::timeout(60)->post("{$this->baseUrl}/api/chat", $payload);

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('LLM chat failed: ' . $response->body());
        } catch (\Exception $e) {
            Log::error('LLM chat failed', ['error' => $e->getMessage()]);
            throw $e;
        }
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
        try {
            $payload = [
                'message' => $message,
                'conversation_history' => $history,
                'context' => $context,
            ];
            
            // Extract model_id from history or personaData if present
            $modelId = $history['model_id'] ?? $personaData['model_id'] ?? null;
            if ($modelId) {
                $payload['model_id'] = $modelId;
                // Remove from history if it was passed there
                if (isset($history['model_id'])) {
                    unset($history['model_id']);
                    $payload['conversation_history'] = array_values($history);
                }
            }

            if ($projectId) {
                $payload['project_id'] = (string)$projectId;
            }
            
            // Add persona data if provided
            if ($personaData) {
                $payload['persona_id'] = $personaData['id'] ?? null;
                $payload['persona_data'] = $personaData;
            }
            
            // Get full response from LLM
            $response = Http::timeout(120)->post("{$this->baseUrl}/api/chat", $payload);

            if ($response->successful()) {
                $data = $response->json();
                $fullResponse = $data['response'] ?? '';
                
                // Send complete response in one chunk for instant display
                if ($onChunk && !empty($fullResponse)) {
                    $onChunk($fullResponse);
                }
                
                return $data;
            }

            throw new \Exception('LLM chat stream failed: ' . $response->body());
        } catch (\Exception $e) {
            Log::error('LLM chat stream failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Generate persona-specific view
     */
    public function generatePersonaView(string $requirementText, string $personaName, string $personaPrompt): array
    {
        try {
            $response = Http::timeout(60)->post("{$this->baseUrl}/api/persona/generate", [
                'requirement_text' => $requirementText,
                'persona_name' => $personaName,
                'persona_prompt' => $personaPrompt,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('Persona generation failed');
        } catch (\Exception $e) {
            Log::error('Persona generation failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Test connection to LLM service
     */
    public function testConnection(): bool
    {
        try {
            $response = Http::timeout(10)->get("{$this->baseUrl}/health");
            return $response->successful();
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
        try {
            $response = Http::withHeaders($this->getHeaders())
                ->timeout(120)
                ->post("{$this->baseUrl}/kb/build", [
                    'project_id' => (string) $projectId,
                    'documents' => $documents,
                    'mode' => $mode,
                ]);

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('LLM KB build failed: ' . $response->body());
        } catch (\Exception $e) {
            Log::error('LLM KB build failed', ['error' => $e->getMessage()]);
            throw $e;
        }
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
            $response = Http::withHeaders($this->getHeaders())
                ->timeout(30)
                ->post("{$this->baseUrl}/kb/query", [
                    'project_id' => (string) $projectId,
                    'query' => $query,
                    'top_k' => $topK,
                ]);

            if ($response->successful()) {
                return $response->json();
            }

            // If KB not found, return empty results
            if ($response->status() === 404) {
                return [
                    'project_id' => (string) $projectId,
                    'query' => $query,
                    'results' => [],
                    'scores' => [],
                    'total_results' => 0,
                ];
            }

            throw new \Exception('LLM KB query failed: ' . $response->body());
        } catch (\Exception $e) {
            Log::error('LLM KB query failed', ['error' => $e->getMessage()]);
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
        try {
            $response = Http::withHeaders($this->getHeaders())
                ->timeout(10)
                ->get("{$this->baseUrl}/kb/status/{$projectId}");

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('LLM KB status check failed: ' . $response->body());
        } catch (\Exception $e) {
            Log::error('LLM KB status check failed', ['error' => $e->getMessage()]);
            throw $e;
        }
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
        try {
            $response = Http::withHeaders($this->getHeaders())
                ->timeout(60)
                ->post("{$this->baseUrl}/kb/incremental", [
                    'project_id' => (string) $projectId,
                    'documents' => $documents,
                ]);

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('LLM KB incremental update failed: ' . $response->body());
        } catch (\Exception $e) {
            Log::error('LLM KB incremental update failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Remove documents from the KB for a project.
     * The LLM backend should accept a payload with filters or explicit document identifiers.
     * Example payload: ['project_id' => '1', 'filters' => ['meta_conflict_ids' => ['123']]]
     *
     * @param int $projectId
     * @param array $filters
     * @return array
     * @throws \Exception
     */
    public function removeFromKB(int $projectId, array $filters): array
    {
        try {
            $payload = [
                'project_id' => (string) $projectId,
                'filters' => $filters,
            ];

            $response = Http::withHeaders($this->getHeaders())
                ->timeout(30)
                ->post("{$this->baseUrl}/kb/remove", $payload);

            if ($response->successful()) {
                return $response->json();
            }

            // If endpoint not implemented on LLM side, log and return error array
            throw new \Exception('LLM KB remove failed: ' . $response->body());
        } catch (\Exception $e) {
            Log::error('LLM KB remove failed', ['error' => $e->getMessage(), 'project_id' => $projectId, 'filters' => $filters]);
            throw $e;
        }
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
        try {
            $response = Http::withHeaders($this->getHeaders())
                ->timeout(10)
                ->get("{$this->baseUrl}/kb/job/{$jobId}");

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('LLM job status check failed: ' . $response->body());
        } catch (\Exception $e) {
            Log::error('LLM job status check failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Sync models from LLM service and update local database.
     * 
     * @return array
     */
    public function syncModels(): array
    {
        try {
            // Call Python service to get models
            $response = Http::withHeaders($this->getHeaders())
                ->timeout(30)
                ->get("{$this->baseUrl}/models");

            if (!$response->successful()) {
                throw new \Exception('Failed to fetch models from LLM service: ' . $response->body());
            }

            $models = $response->json(); 
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
            $response = Http::withHeaders($this->getHeaders())
                ->timeout(45)
                ->post("{$this->baseUrl}/models/check-tools", [
                    'model_id' => $model->model_id,
                    'provider' => $model->provider,
                ]);

            if ($response->successful()) {
                $result = $response->json();
                $model->supports_tools = $result['supports_tools'] ?? false;
                $model->save();
            }
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