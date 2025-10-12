<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConversationRequest;
use App\Http\Requests\MessageRequest;
use App\Models\Conversation;
use App\Services\ConversationService;

class ConversationController extends Controller
{
    protected $conversation_service;

    public function __construct(ConversationService $conversation_service)
    {
        $this->conversation_service = $conversation_service;
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
        $message = $this->conversation_service->sendMessage($conversationId, $request->validated());
        return response()->json($message, 201);
    }
}
