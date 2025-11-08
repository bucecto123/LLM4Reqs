<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

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
    public function chat(string $message, array $history = [], ?string $context = null, ?array $personaData = null): array
    {
        try {
            $payload = [
                'message' => $message,
                'conversation_history' => $history,
                'context' => $context,
            ];
            
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
}