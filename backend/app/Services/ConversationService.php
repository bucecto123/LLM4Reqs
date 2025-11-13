<?php

namespace App\Services;

use App\Events\MessageChunk;
use App\Models\Conversation;
use App\Models\KnowledgeBase;
use App\Models\Message;
use App\Utils\TextCommons;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ConversationService
{
    protected $llmService;
    protected $textCommons;

    public function __construct(LLMService $llmService, TextCommons $textCommons)
    {
        $this->llmService = $llmService;
        $this->textCommons = $textCommons;
    }

    public function createConversation($data)
    {
        return Conversation::create([
            'project_id' => $data['project_id'] ?? null,
            'user_id' => Auth::id(),
            'requirement_id' => $data['requirement_id'] ?? null,
            'title' => $data['title'] ?? null,
            'context' => $data['context'] ?? null
        ]);
    }

    public function getMessages($conversationId)
    {
        return Message::where('conversation_id', $conversationId)->get();
    }

    public function sendMessage($conversationId, $messageData)
    {
        // Clean the incoming message content
        if (isset($messageData['content'])) {
            $messageData['content'] = $this->textCommons->cleanUtf8Content($messageData['content']);
        }

        // Separate display message from AI context message
        $displayMessage = $messageData['content'];
        $aiContextMessage = $messageData['content'];

        // Check if message contains document contents
        if (strpos($displayMessage, "\n\nUploaded document contents:\n\n") !== false) {
            $parts = explode("\n\nUploaded document contents:\n\n", $displayMessage, 2);
            $displayMessage = trim($parts[0]);
            
            if (empty($displayMessage)) {
                $displayMessage = "📎 Uploaded documents for analysis";
            }
        }

        // Save only the clean display message
        $userMessageData = $messageData;
        $userMessageData['content'] = $displayMessage;
        $userMessage = $this->saveMessage($conversationId, $userMessageData);

        // Get conversation with its documents
        $conversation = Conversation::with(['documents' => function($query) {
            $query->where('status', 'uploaded')
                    ->whereNotNull('content')
                    ->where('content', '!=', '');
        }])->findOrFail($conversationId);

        // Get conversation history
        $messages = $this->getMessages($conversationId);
            
        // Prepare conversation history for LLM
        $history = [];
        $recentMessages = $messages->take(-6);
        foreach ($recentMessages as $msg) {
            if ($msg->role && $msg->content) {
                $content = $this->textCommons->cleanUtf8Content($msg->content);
                if (strlen($content) > 2000) {
                    $content = mb_substr($content, 0, 2000, 'UTF-8') . '... [message truncated]';
                }
                
                $history[] = [
                    'role' => $msg->role === 'user' ? 'user' : 'assistant',
                    'content' => $content
                ];
            }
        }
            
        $documentContext = '';
        $kbContext = '';
        
        // Check if conversation has a project with ready KB
        if ($conversation->project_id) {
            $kb = KnowledgeBase::where('project_id', $conversation->project_id)->first();
            
            if ($kb && $kb->isReady()) {
                try {
                    Log::info('Querying KB for context', [
                        'conversation_id' => $conversationId,
                        'project_id' => $conversation->project_id,
                        'query' => mb_substr($displayMessage, 0, 100)
                    ]);
                    
                    // Query KB for relevant chunks
                    $kbResults = $this->llmService->queryKB($conversation->project_id, $displayMessage, 5);
                    
                    Log::info('KB query results', [
                        'results_count' => count($kbResults['results'] ?? []),
                        'raw_response' => $kbResults
                    ]);
                    
                    if (!empty($kbResults['results']) && is_array($kbResults['results'])) {
                        $kbContext = "\n\n=== KNOWLEDGE BASE CONTEXT (Relevant Requirements) ===\n";
                        
                        foreach ($kbResults['results'] as $index => $result) {
                            $score = $kbResults['scores'][$index] ?? 0;
                            
                            // Handle result format - could be string or array
                            if (is_array($result)) {
                                $content = $result['content'] ?? $result['text'] ?? json_encode($result);
                                $metadata = $result['metadata'] ?? $result['meta'] ?? [];
                            } else {
                                $content = (string)$result;
                                $metadata = [];
                            }
                            
                            $kbContext .= sprintf(
                                "\n[Chunk %d - Relevance: %.2f]\n%s\n",
                                $index + 1,
                                $score,
                                $content
                            );
                            
                            // Add metadata if available
                            if (!empty($metadata)) {
                                if (isset($metadata['filename'])) {
                                    $kbContext .= "  Source: " . $metadata['filename'] . "\n";
                                }
                                if (isset($metadata['type'])) {
                                    $kbContext .= "  Type: " . $metadata['type'] . "\n";
                                }
                            }
                        }
                        
                        $kbContext .= "\n=== END KNOWLEDGE BASE CONTEXT ===\n";
                        
                        Log::info('KB context added to conversation', [
                            'conversation_id' => $conversationId,
                            'project_id' => $conversation->project_id,
                            'chunks_found' => count($kbResults['results']),
                            'context_length' => strlen($kbContext)
                        ]);
                    } else {
                        Log::warning('KB query returned no results', [
                            'conversation_id' => $conversationId,
                            'project_id' => $conversation->project_id
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::warning('Failed to query KB, falling back to document context', [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                        'project_id' => $conversation->project_id,
                    ]);
                }
            } else {
                Log::info('KB not ready for project', [
                    'project_id' => $conversation->project_id,
                    'kb_status' => $kb ? $kb->status : 'not_found'
                ]);
            }
        }
        
        // Fallback to uploaded documents if KB context is empty
        if (empty($kbContext) && $conversation->documents->count() > 0) {
            $documentContext = "\n\n=== UPLOADED DOCUMENTS CONTEXT ===\n";
            $totalTokens = 0;
            $maxDocumentTokens = 6000;
            
            foreach ($conversation->documents as $document) {
                $fileHeader = "\n--- File: {$document->original_filename} ---\n";
                $content = $document->content ?? '';
                
                $content = $this->textCommons->cleanUtf8Content($content);
                
                $headerTokens = strlen($fileHeader) / 3;
                $contentTokens = strlen($content) / 3;
                
                if ($totalTokens + $headerTokens + $contentTokens > $maxDocumentTokens) {
                    $remainingTokens = $maxDocumentTokens - $totalTokens - $headerTokens;
                    if ($remainingTokens > 100) {
                        $truncatedLength = (int)($remainingTokens * 3);
                        $content = mb_substr($content, 0, $truncatedLength, 'UTF-8') . "\n... [Content truncated to fit token limits] ...";
                        $documentContext .= $fileHeader . $content . "\n";
                    }
                    break;
                } else {
                    $documentContext .= $fileHeader . $content . "\n";
                    $totalTokens += $headerTokens + $contentTokens;
                }
            }
            $documentContext .= "\n=== END DOCUMENTS CONTEXT ===\n\n";
        }

        // Enhanced context with document information
        $enhancedContext = 'You are helping with requirements engineering and software development.';
        
        // Prioritize KB context if available
        if (!empty($kbContext)) {
            $enhancedContext .= ' The following are relevant requirements from the project knowledge base. Use these to provide accurate, context-aware answers.' . $kbContext;
        } elseif (!empty($documentContext)) {
            $enhancedContext .= ' The user has uploaded documents in this conversation. Use the document contents provided in the context to answer questions and provide relevant assistance.' . $documentContext;
        }

        // Check if persona context should be added
        $personaData = null;
        if (isset($messageData['persona_id']) && $messageData['persona_id']) {
            try {
                $persona = \App\Models\Persona::find($messageData['persona_id']);
                if ($persona) {
                    $personaData = [
                        'id' => $persona->id,
                        'name' => $persona->name,
                        'type' => $persona->type,
                        'role' => $persona->role,
                        'description' => $persona->description,
                        'priorities' => $persona->priorities,
                        'concerns' => $persona->concerns,
                        'typical_requirements' => $persona->typical_requirements,
                        'communication_style' => $persona->communication_style,
                        'technical_level' => $persona->technical_level,
                        'focus_areas' => $persona->focus_areas,
                        'example_questions' => $persona->example_questions,
                        'custom_attributes' => $persona->custom_attributes,
                    ];
                    
                    Log::info('Using persona for conversation', [
                        'persona_id' => $persona->id,
                        'persona_name' => $persona->name,
                        'conversation_id' => $conversationId
                    ]);
                }
            } catch (\Exception $e) {
                Log::warning('Failed to load persona', [
                    'persona_id' => $messageData['persona_id'],
                    'error' => $e->getMessage()
                ]);
            }
        }

        // Get AI response from LLM service (with optional persona)
        $llmResponse = $this->llmService->chat(
            $aiContextMessage, 
            $history,
            $enhancedContext,
            $personaData  // NEW: Pass persona data
        );

        // Save the AI response (with persona_id if used)
        $aiMessage = $this->saveMessage($conversationId, [
            'content' => $this->textCommons->cleanUtf8Content($llmResponse['response']),
            'role' => 'assistant',
            'model_used' => $llmResponse['model'] ?? null,
            'tokens_used' => $llmResponse['tokens_used'] ?? null,
            'persona_id' => $messageData['persona_id'] ?? null  // NEW: Save persona context
        ]);

        return [
            'user_message' => $userMessage,
            'ai_message' => $aiMessage,
            'success' => true
        ];
    }

    /**
     * Send message with streaming support
     * Broadcasts chunks in real-time via WebSocket
     */
    public function sendMessageStream($conversationId, $messageData)
    {
        // Use same setup as sendMessage for consistency
        if (isset($messageData['content'])) {
            $messageData['content'] = $this->textCommons->cleanUtf8Content($messageData['content']);
        }

        $displayMessage = $messageData['content'];
        $aiContextMessage = $messageData['content'];

        if (strpos($displayMessage, "\n\nUploaded document contents:\n\n") !== false) {
            $parts = explode("\n\nUploaded document contents:\n\n", $displayMessage, 2);
            $displayMessage = trim($parts[0]);
            
            if (empty($displayMessage)) {
                $displayMessage = "📎 Uploaded documents for analysis";
            }
        }

        // Note: User message is already saved in the controller
        // No need to save it again here to avoid duplicates
        
        $conversation = Conversation::with(['documents' => function($query) {
            $query->where('status', 'uploaded')
                    ->whereNotNull('content')
                    ->where('content', '!=', '');
        }])->findOrFail($conversationId);

        $messages = $this->getMessages($conversationId);
            
        $history = [];
        $recentMessages = $messages->take(-6);
        foreach ($recentMessages as $msg) {
            if ($msg->role && $msg->content) {
                $content = $this->textCommons->cleanUtf8Content($msg->content);
                if (strlen($content) > 2000) {
                    $content = mb_substr($content, 0, 2000, 'UTF-8') . '... [message truncated]';
                }
                
                $history[] = [
                    'role' => $msg->role === 'user' ? 'user' : 'assistant',
                    'content' => $content
                ];
            }
        }
            
        $documentContext = '';
        $kbContext = '';
        
        // Check KB context (same as sendMessage)
        if ($conversation->project_id) {
            $kb = KnowledgeBase::where('project_id', $conversation->project_id)->first();
            
            if ($kb && $kb->isReady()) {
                try {
                    $kbResults = $this->llmService->queryKB($conversation->project_id, $displayMessage, 5);
                    
                    if (!empty($kbResults['results']) && is_array($kbResults['results'])) {
                        $kbContext = "\n\n=== KNOWLEDGE BASE CONTEXT (Relevant Requirements) ===\n";
                        
                        foreach ($kbResults['results'] as $index => $result) {
                            $score = $kbResults['scores'][$index] ?? 0;
                            
                            if (is_array($result)) {
                                $content = $result['content'] ?? $result['text'] ?? json_encode($result);
                                $metadata = $result['metadata'] ?? $result['meta'] ?? [];
                            } else {
                                $content = (string)$result;
                                $metadata = [];
                            }
                            
                            $kbContext .= sprintf(
                                "\n[Chunk %d - Relevance: %.2f]\n%s\n",
                                $index + 1,
                                $score,
                                $content
                            );
                            
                            if (!empty($metadata)) {
                                if (isset($metadata['filename'])) {
                                    $kbContext .= "  Source: " . $metadata['filename'] . "\n";
                                }
                            }
                        }
                        
                        $kbContext .= "\n=== END KNOWLEDGE BASE CONTEXT ===\n";
                    }
                } catch (\Exception $e) {
                    Log::warning('Failed to query KB for streaming', ['error' => $e->getMessage()]);
                }
            }
        }
        
        // Fallback to documents if no KB context
        if (empty($kbContext) && $conversation->documents->count() > 0) {
            $documentContext = "\n\n=== UPLOADED DOCUMENTS CONTEXT ===\n";
            $totalTokens = 0;
            $maxDocumentTokens = 6000;
            
            foreach ($conversation->documents as $document) {
                $fileHeader = "\n--- File: {$document->original_filename} ---\n";
                $content = $document->content ?? '';
                $content = $this->textCommons->cleanUtf8Content($content);
                
                $headerTokens = strlen($fileHeader) / 3;
                $contentTokens = strlen($content) / 3;
                
                if ($totalTokens + $headerTokens + $contentTokens > $maxDocumentTokens) {
                    $remainingTokens = $maxDocumentTokens - $totalTokens - $headerTokens;
                    if ($remainingTokens > 100) {
                        $truncatedLength = (int)($remainingTokens * 3);
                        $content = mb_substr($content, 0, $truncatedLength, 'UTF-8') . "\n... [Content truncated] ...";
                        $documentContext .= $fileHeader . $content . "\n";
                    }
                    break;
                } else {
                    $documentContext .= $fileHeader . $content . "\n";
                    $totalTokens += $headerTokens + $contentTokens;
                }
            }
            $documentContext .= "\n=== END DOCUMENTS CONTEXT ===\n\n";
        }

        $enhancedContext = 'You are helping with requirements engineering and software development.';
        
        if (!empty($kbContext)) {
            $enhancedContext .= ' The following are relevant requirements from the project knowledge base.' . $kbContext;
        } elseif (!empty($documentContext)) {
            $enhancedContext .= ' The user has uploaded documents in this conversation.' . $documentContext;
        }

        $personaData = null;
        if (isset($messageData['persona_id']) && $messageData['persona_id']) {
            try {
                $persona = \App\Models\Persona::find($messageData['persona_id']);
                if ($persona) {
                    $personaData = [
                        'id' => $persona->id,
                        'name' => $persona->name,
                        'type' => $persona->type,
                        'role' => $persona->role,
                        'description' => $persona->description,
                        'priorities' => $persona->priorities,
                        'concerns' => $persona->concerns,
                        'typical_requirements' => $persona->typical_requirements,
                        'communication_style' => $persona->communication_style,
                        'technical_level' => $persona->technical_level,
                        'focus_areas' => $persona->focus_areas,
                        'example_questions' => $persona->example_questions,
                        'custom_attributes' => $persona->custom_attributes,
                    ];
                }
            } catch (\Exception $e) {
                Log::warning('Failed to load persona for streaming', ['error' => $e->getMessage()]);
            }
        }

        // Create temporary message ID for streaming
        $tempMessageId = 'temp_' . uniqid();
        
        // Broadcast streaming started
        broadcast(new MessageChunk(
            $conversationId,
            $tempMessageId,
            '',
            false,
            ['status' => 'started']
        ))->toOthers();

        // Stream the response with callback
        $llmResponse = $this->llmService->chatStream(
            $aiContextMessage,
            $history,
            $enhancedContext,
            $personaData,
            function($chunk) use ($conversationId, $tempMessageId) {
                // Broadcast each chunk via WebSocket
                broadcast(new MessageChunk(
                    $conversationId,
                    $tempMessageId,
                    $chunk,
                    false
                ))->toOthers();
            }
        );

        // Save the complete AI response
        $aiMessage = $this->saveMessage($conversationId, [
            'content' => $this->textCommons->cleanUtf8Content($llmResponse['response']),
            'role' => 'assistant',
            'model_used' => $llmResponse['model'] ?? null,
            'tokens_used' => $llmResponse['tokens_used'] ?? null,
            'persona_id' => $messageData['persona_id'] ?? null
        ]);

        // Broadcast completion with real message ID
        broadcast(new MessageChunk(
            $conversationId,
            (string)$aiMessage->id,
            '',
            true,
            ['message' => $aiMessage->toArray()]
        ))->toOthers();

        return [
            'user_message' => $userMessage,
            'ai_message' => $aiMessage,
            'success' => true,
            'streaming' => true
        ];
    }

    /**
     * Save user message only (for quick API response)
     */
    public function saveUserMessage($conversationId, $messageData)
    {
        // Clean the incoming message content
        if (isset($messageData['content'])) {
            $messageData['content'] = $this->textCommons->cleanUtf8Content($messageData['content']);
        }

        $displayMessage = $messageData['content'];

        // Check if message contains document contents
        if (strpos($displayMessage, "\n\nUploaded document contents:\n\n") !== false) {
            $parts = explode("\n\nUploaded document contents:\n\n", $displayMessage, 2);
            $displayMessage = trim($parts[0]);
            
            if (empty($displayMessage)) {
                $displayMessage = "📎 Uploaded documents for analysis";
            }
        }

        // Save only the clean display message
        $userMessageData = $messageData;
        $userMessageData['content'] = $displayMessage;
        $userMessageData['role'] = 'user';
        
        return $this->saveMessage($conversationId, $userMessageData);
    }

    private function saveMessage($conversationId, $data)
    {
        $message = Message::create([
            'conversation_id' => $conversationId,
            'role' => $data['role'],
            'content' => $data['content'] ?? null,
            'model_used' => $data['model_used'] ?? null,
            'tokens_used' => $data['tokens_used'] ?? null
        ]);

        return $message;
    }
}