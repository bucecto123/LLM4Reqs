<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConversationRequest;
use App\Http\Requests\MessageRequest;
use App\Models\Conversation;
use App\Services\ConversationService;
use App\Services\LLMService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class ConversationController extends Controller
{
    protected $conversation_service;
    protected $llm_service;

    public function __construct(ConversationService $conversation_service, LLMService $llm_service)
    {
        $this->conversation_service = $conversation_service;
        $this->llm_service = $llm_service;
    }

    /**
     * Get all conversations for the authenticated user (normal chat workflow)
     * These are conversations with null project_id
     */
    public function getUserConversations()
    {
        $conversations = Conversation::where('user_id', Auth::id())
            ->whereNull('project_id')
            ->orderBy('updated_at', 'desc')
            ->get();
        return response()->json($conversations);
    }

    /**
     * Get conversations for a specific project (project chat workflow)
     */
    public function getProjectConversations($projectId)
    {
        $conversations = Conversation::where('project_id', $projectId)
            ->where('user_id', Auth::id())
            ->orderBy('updated_at', 'desc')
            ->get();
        return response()->json($conversations);
    }

    /**
     * @deprecated Use getUserConversations or getProjectConversations instead
     */
    public function index($projectId)
    {
        // Keep for backward compatibility
        return $this->getProjectConversations($projectId);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(ConversationRequest $request)
    {
        $new_conversation = $this->conversation_service->createConversation($request->validated());
        return response()->json($new_conversation, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $messages = $this->conversation_service->getMessages($id);
        return response()->json($messages);
    }
    
    public function sendMessage(MessageRequest $request, string $conversationId)
    {
        try {
            // Clean the incoming message content
            $messageData = $request->validated();
            if (isset($messageData['content'])) {
                $messageData['content'] = $this->cleanUtf8Content($messageData['content']);
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
            $userMessage = $this->conversation_service->sendMessage($conversationId, $userMessageData);
            
            // Get conversation with its documents
            $conversation = Conversation::with(['documents' => function($query) {
                $query->where('status', 'uploaded')
                      ->whereNotNull('content')
                      ->where('content', '!=', '');
            }])->findOrFail($conversationId);
            
            // Get conversation history for context
            $messages = $this->conversation_service->getMessages($conversationId);
            
            // Prepare conversation history for LLM (limit to last 6 messages to save tokens)
            $history = [];
            $recentMessages = $messages->take(-6); // Reduced from 10 to 6
            foreach ($recentMessages as $msg) {
                if ($msg->role && $msg->content) {
                    // Clean and truncate individual messages if they're too long
                    $content = $this->cleanUtf8Content($msg->content);
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
            if ($conversation->documents->count() > 0) {
                $documentContext = "\n\n=== UPLOADED DOCUMENTS CONTEXT ===\n";
                $totalTokens = 0;
                $maxDocumentTokens = 6000; // Reserve tokens for document context (roughly 4500 words)
                
                foreach ($conversation->documents as $document) {
                    $fileHeader = "\n--- File: {$document->original_filename} ---\n";
                    $content = $document->content ?? '';
                    
                    // Clean content to prevent encoding issues
                    $content = $this->cleanUtf8Content($content);
                    
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
            if (!empty($documentContext)) {
                $enhancedContext .= ' The user has uploaded documents in this conversation. Use the document contents provided in the context to answer questions and provide relevant assistance.' . $documentContext;
            }
            
            // Get AI response from LLM service using the full context message
            $llmResponse = $this->llm_service->chat(
                $aiContextMessage, 
                $history,
                $enhancedContext
            );
            
            // Save the AI response (clean the content first)
            $aiMessage = $this->conversation_service->sendMessage($conversationId, [
                'content' => $this->cleanUtf8Content($llmResponse['response']),
                'role' => 'assistant',
                'model_used' => $llmResponse['model'] ?? null,
                'tokens_used' => $llmResponse['tokens_used'] ?? null
            ]);
            
            return response()->json([
                'user_message' => $userMessage,
                'ai_message' => $aiMessage,
                'success' => true
            ], 201);
            
        } catch (\Exception $e) {
            Log::error('Failed to send message: ' . $e->getMessage());
            
            $errorMessage = 'Failed to generate AI response';
            
            // Handle specific error types
            if (strpos($e->getMessage(), 'Malformed UTF-8') !== false || 
                strpos($e->getMessage(), 'json_encode') !== false) {
                $errorMessage = 'Message contains invalid characters. Please check your file encoding.';
            } elseif (strpos($e->getMessage(), 'Request too large') !== false ||
                     strpos($e->getMessage(), 'rate_limit_exceeded') !== false) {
                $errorMessage = 'Message is too large. Please try with smaller files or shorter text.';
            }
            
            return response()->json([
                'error' => $errorMessage,
                'message' => $e->getMessage(),
                'user_message' => $userMessage ?? null
            ], 500);
        }
    }

    /**
     * Update the specified conversation.
     */
    public function update(ConversationRequest $request, string $id)
    {
        $conversation = Conversation::with('project')->findOrFail($id);
        
        // Check if user owns this conversation
        // For project-based conversations, check project ownership
        // For normal conversations, check user ownership directly
        if ($conversation->project_id) {
            if (!$conversation->project || $conversation->project->owner_id !== Auth::id()) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
        } else {
            if ($conversation->user_id !== Auth::id()) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
        }
        
        // Only update the fields that are provided and validated
        $validatedData = $request->validated();
        $conversation->update($validatedData);
        
        return response()->json([
            'message' => 'Conversation updated successfully',
            'conversation' => $conversation
        ]);
    }

    /**
     * Remove the specified conversation from storage.
     */
    public function destroy(string $id)
    {
        $conversation = Conversation::with('project')->findOrFail($id);
        
        // Check if user owns this conversation
        // For project-based conversations, check project ownership
        // For normal conversations, check user ownership directly
        if ($conversation->project_id) {
            if (!$conversation->project || $conversation->project->owner_id !== Auth::id()) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
        } else {
            if ($conversation->user_id !== Auth::id()) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
        }
        
        $conversation->delete();
        return response()->json(['message' => 'Conversation deleted successfully']);
    }

    /**
     * Clean and validate UTF-8 content to prevent encoding errors
     */
    private function cleanUtf8Content($content)
    {
        if (empty($content)) {
            return '';
        }
        
        // Convert to UTF-8 if not already
        if (!mb_check_encoding($content, 'UTF-8')) {
            // Try to detect encoding and convert
            $encoding = mb_detect_encoding($content, ['UTF-8', 'ISO-8859-1', 'Windows-1252', 'ASCII'], true);
            if ($encoding) {
                $content = mb_convert_encoding($content, 'UTF-8', $encoding);
            }
        }
        
        // Remove invalid UTF-8 sequences
        $content = mb_convert_encoding($content, 'UTF-8', 'UTF-8');
        
        // Remove control characters except newlines, tabs, and carriage returns
        $content = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $content);
        
        return $content;
    }
}
