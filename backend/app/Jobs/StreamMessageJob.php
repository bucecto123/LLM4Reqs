<?php

namespace App\Jobs;

use App\Events\MessageChunk;
use App\Services\ConversationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class StreamMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $conversationId;
    public array $messageData;

    /**
     * Create a new job instance.
     */
    public function __construct(int $conversationId, array $messageData)
    {
        $this->conversationId = $conversationId;
        $this->messageData = $messageData;
    }

    /**
     * Execute the job.
     */
    public function handle(ConversationService $conversationService): void
    {
        try {
            Log::info('StreamMessageJob: Starting stream', [
                'conversation_id' => $this->conversationId
            ]);

            // This will handle the streaming via WebSocket
            $conversationService->sendMessageStream($this->conversationId, $this->messageData);

            Log::info('StreamMessageJob: Stream completed', [
                'conversation_id' => $this->conversationId
            ]);
        } catch (\Exception $e) {
            Log::error('StreamMessageJob: Failed', [
                'conversation_id' => $this->conversationId,
                'error' => $e->getMessage()
            ]);

            // Broadcast error to frontend
            broadcast(new MessageChunk(
                $this->conversationId,
                'error',
                '',
                true,
                ['error' => $e->getMessage()]
            ))->toOthers();
        }
    }
}
