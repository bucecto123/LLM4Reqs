<?php

namespace App\Services;

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
            'project_id' => $data['project_id'] ?? null, // Allow null for normal chat workflow
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
        // If the message contains document contents, extract just the user's actual message for storage
        $displayMessage = $messageData['content'];
        $aiContextMessage = $messageData['content'];

        // Check if message contains document contents (typical pattern)
        if (strpos($displayMessage, "\n\nUploaded document contents:\n\n") !== false) {
            // Extract just the user's message part (before document contents)
            $parts = explode("\n\nUploaded document contents:\n\n", $displayMessage, 2);
            $displayMessage = trim($parts[0]);
            
            // If the user's message is empty, provide a default message
            if (empty($displayMessage)) {
                $displayMessage = "📎 Uploaded documents for analysis";
            }
        }

        // Save only the clean display message (without document contents)
        $userMessageData = $messageData;
        $userMessageData['content'] = $displayMessage;
        $userMessage = $this->saveMessage($conversationId, $userMessageData);

        // Get conversation with its documents
        $conversation = Conversation::with(['documents' => function($query) {
            $query->where('status', 'uploaded')
                    ->whereNotNull('content')
                    ->where('content', '!=', '');
        }])->findOrFail($conversationId);

        // Get conversation history for context
        $messages = $this->getMessages($conversationId);
            
        // Prepare conversation history for LLM (limit to last 6 messages to save tokens)
        $history = [];
        $recentMessages = $messages->take(-6);
        foreach ($recentMessages as $msg) {
            if ($msg->role && $msg->content) {
                // Clean and truncate individual messages if they're too long
                $content = $this->textCommons->cleanUtf8Content($msg->content);
                if (strlen($content) > 2000) { // Limit individual messages
                    $content = mb_substr($content, 0, 2000, 'UTF-8') . '... [message truncated]';
                }
                
                $history[] = [
                    'role' => $msg->role === 'user' ? 'user' : 'assistant',
                    'content' => $content
                ];
            }
        }
            
        // Build context from uploaded documents with token management
        $documentContext = '';
        $kbContext = '';
        
        // NEW: Check if conversation has a project with ready KB
        if ($conversation->project_id) {
            $kb = KnowledgeBase::where('project_id', $conversation->project_id)->first();
            
            if ($kb && $kb->isReady()) {
                try {
                    // Query KB for relevant chunks
                    $kbResults = $this->llmService->queryKB($conversation->project_id, $displayMessage, 5);
                    
                    if (!empty($kbResults['results'])) {
                        $kbContext = "\n\n=== KNOWLEDGE BASE CONTEXT (Relevant Requirements) ===\n";
                        
                        foreach ($kbResults['results'] as $index => $result) {
                            $score = $kbResults['scores'][$index] ?? 0;
                            $kbContext .= sprintf(
                                "\n[Relevance: %.2f] %s\n",
                                $score,
                                $result['content']
                            );
                            
                            // Add metadata if available
                            if (!empty($result['metadata'])) {
                                $kbContext .= "  Type: " . ($result['metadata']['type'] ?? 'N/A') . "\n";
                            }
                        }
                        
                        $kbContext .= "\n=== END KNOWLEDGE BASE CONTEXT ===\n";
                        
                        Log::info('KB context added to conversation', [
                            'conversation_id' => $conversationId,
                            'project_id' => $conversation->project_id,
                            'chunks_found' => count($kbResults['results']),
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::warning('Failed to query KB, falling back to document context', [
                        'error' => $e->getMessage(),
                        'project_id' => $conversation->project_id,
                    ]);
                }
            }
        }
        
        // Fallback to uploaded documents if KB context is empty
        if (empty($kbContext) && $conversation->documents->count() > 0) {
            $documentContext = "\n\n=== UPLOADED DOCUMENTS CONTEXT ===\n";
            $totalTokens = 0;
            $maxDocumentTokens = 6000; // Reserve tokens for document context (roughly 4500 words)
            
            foreach ($conversation->documents as $document) {
                $fileHeader = "\n--- File: {$document->original_filename} ---\n";
                $content = $document->content ?? '';
                
                // Clean content to prevent encoding issues
                $content = $this->textCommons->cleanUtf8Content($content);
                
                // Estimate tokens (rough approximation: 1 token ≈ 0.75 words, 1 word ≈ 4 characters)
                $headerTokens = strlen($fileHeader) / 3;
                $contentTokens = strlen($content) / 3;
                
                if ($totalTokens + $headerTokens + $contentTokens > $maxDocumentTokens) {
                    // Truncate content to fit within limit
                    $remainingTokens = $maxDocumentTokens - $totalTokens - $headerTokens;
                    if ($remainingTokens > 100) { // Only add if we have reasonable space left
                        $truncatedLength = (int)($remainingTokens * 3);
                        $content = mb_substr($content, 0, $truncatedLength, 'UTF-8') . "\n... [Content truncated to fit token limits] ...";
                        $documentContext .= $fileHeader . $content . "\n";
                    }
                    break; // Stop adding more documents
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

        // Get AI response from LLM service using the full context message
        $llmResponse = $this->llmService->chat(
            $aiContextMessage, 
            $history,
            $enhancedContext
        );

        // Save the AI response (clean the content first)
        $aiMessage = $this->saveMessage($conversationId, [
            'content' => $this->textCommons->cleanUtf8Content($llmResponse['response']),
            'role' => 'assistant',
            'model_used' => $llmResponse['model'] ?? null,
            'tokens_used' => $llmResponse['tokens_used'] ?? null
        ]);

        return [
            'user_message' => $userMessage,
            'ai_message' => $aiMessage,
            'success' => true
        ];
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
