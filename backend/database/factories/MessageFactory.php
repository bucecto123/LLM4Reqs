<?php

namespace Database\Factories;

use App\Models\Message;
use App\Models\Conversation;
use Illuminate\Database\Eloquent\Factories\Factory;

class MessageFactory extends Factory
{
    protected $model = Message::class;

    public function definition()
    {
        return [
            'conversation_id' => Conversation::factory(),
            'role' => 'user',
            'content' => $this->faker->sentence(),
            'model_used' => 'gpt-4',
            'tokens_used' => $this->faker->numberBetween(10, 200),
        ];
    }
}
