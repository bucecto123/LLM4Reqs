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
    protected $conversationService;
    protected $llmService;

    public function __construct(ConversationService $conversationService, LLMService $llmService)
    {
        $this->conversationService = $conversationService;
        $this->llmService = $llmService;
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
        $new_conversation = $this->conversationService->createConversation($request->validated());
        return response()->json($new_conversation, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $messages = $this->conversationService->getMessages($id);
        return response()->json($messages);
    }
    
    public function sendMessage(MessageRequest $request, string $conversationId)
    {
        try {
            $messageData = $request->validated();
            $message = $this->conversationService->sendMessage($conversationId, $messageData);
            return response()->json($message,201);
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
}
