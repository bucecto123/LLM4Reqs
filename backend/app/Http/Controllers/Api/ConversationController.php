<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConversationRequest;
use App\Http\Requests\MessageRequest;
use App\Models\Conversation;
use App\Services\ConversationService;
use App\Services\LLMService;

class ConversationController extends Controller
{
    protected $conversation_service;
    protected $llm_service;

    public function __construct(ConversationService $conversation_service, LLMService $llm_service)
    {
        $this->conversation_service = $conversation_service;
        $this->llm_service = $llm_service;
    }

    public function index($projectId)
    {
        $conversations = Conversation::where('project_id', $projectId)->get();
        return response()->json($conversations);
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
            // Save the user message
            $userMessage = $this->conversation_service->sendMessage($conversationId, $request->validated());
            
            // Get conversation history for context
            $messages = $this->conversation_service->getMessages($conversationId);
            
            // Prepare conversation history for LLM (limit to last 10 messages to save tokens)
            $history = [];
            $recentMessages = $messages->take(-10);
            foreach ($recentMessages as $msg) {
                if ($msg->role && $msg->content) {
                    $history[] = [
                        'role' => $msg->role === 'user' ? 'user' : 'assistant',
                        'content' => $msg->content
                    ];
                }
            }
            
            // Get AI response from LLM service
            $llmResponse = $this->llm_service->chat(
                $request->validated()['content'], 
                $history,
                'You are helping with requirements engineering and software development.'
            );
            
            // Save the AI response
            $aiMessage = $this->conversation_service->sendMessage($conversationId, [
                'content' => $llmResponse['response'],
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
            \Log::error('Failed to send message: ' . $e->getMessage());
            
            return response()->json([
                'error' => 'Failed to generate AI response',
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
        $conversation = Conversation::findOrFail($id);
        
        // Check if user owns this conversation (through project ownership)
        if ($conversation->project->owner_id !== auth()->id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
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
        $conversation = Conversation::findOrFail($id);
        
        // Check if user owns this conversation (through project ownership)
        if ($conversation->project->owner_id !== auth()->id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        
        $conversation->delete();
        return response()->json(['message' => 'Conversation deleted successfully']);
    }
}
