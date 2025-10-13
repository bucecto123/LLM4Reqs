<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LLMService
{
    private string $baseUrl;

    public function __construct()
    {
  $this->baseUrl = config('services.llm.url', 'http://localhost:8000');
    }

    /**
     * Extract requirements from text
     */
    public function extractRequirements(string $text, string $documentType = 'meeting_notes'): array
    {
        try {
            $response = Http::timeout(90)->post("{$this->baseUrl}/api/extract", [
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
     * Chat with AI
     */
    public function chat(string $message, array $history = [], ?string $context = null): array
    {
        try {
            $response = Http::timeout(60)->post("{$this->baseUrl}/api/chat", [
                'message' => $message,
                'conversation_history' => $history,
                'context' => $context,
            ]);

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
}