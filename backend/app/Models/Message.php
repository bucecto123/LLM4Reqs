<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'persona_id',
        'role',
        'content',
        'model_used',
        'tokens_used'
    ];

    /**
     * Relationship: Message belongs to a conversation
     */
    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }

    /**
     * Relationship: Message belongs to a persona (optional)
     */
    public function persona()
    {
        return $this->belongsTo(Persona::class);
    }
}
