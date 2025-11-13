<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class KBProgressUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $projectId;
    public int $progress;
    public string $stage;
    public string $status;
    public ?string $error;

    /**
     * Create a new event instance.
     */
    public function __construct(
        int $projectId,
        int $progress,
        string $stage,
        string $status,
        ?string $error = null
    ) {
        $this->projectId = $projectId;
        $this->progress = $progress;
        $this->stage = $stage;
        $this->status = $status;
        $this->error = $error;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): Channel
    {
        return new Channel('project.' . $this->projectId);
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'kb.progress';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'project_id' => $this->projectId,
            'progress' => $this->progress,
            'stage' => $this->stage,
            'status' => $this->status,
            'error' => $this->error,
        ];
    }
}
