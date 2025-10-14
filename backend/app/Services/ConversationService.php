<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Support\Facades\Auth;

class ConversationService
{
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

    public function sendMessage($conversationId, $data)
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
