<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageChunk implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $conversationId;
    public string $messageId;
    public string $chunk;
    public bool $isComplete;
    public ?array $metadata;

    /**
     * Create a new event instance.
     */
    public function __construct(
        int $conversationId,
        string $messageId,
        string $chunk,
        bool $isComplete = false,
        ?array $metadata = null
    ) {
        $this->conversationId = $conversationId;
        $this->messageId = $messageId;
        $this->chunk = $chunk;
        $this->isComplete = $isComplete;
        $this->metadata = $metadata;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): Channel
    {
        return new Channel('conversation.' . $this->conversationId);
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'message.chunk';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'conversation_id' => $this->conversationId,
            'message_id' => $this->messageId,
            'chunk' => $this->chunk,
            'is_complete' => $this->isComplete,
            'metadata' => $this->metadata,
        ];
    }
}
