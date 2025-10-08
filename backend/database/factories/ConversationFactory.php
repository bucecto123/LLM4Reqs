<?php

namespace Database\Factories;

use App\Models\Conversation;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ConversationFactory extends Factory
{
    protected $model = Conversation::class;

    public function definition()
    {
        return [
            'project_id' => Project::factory(),
            'user_id' => User::factory(),
            'title' => $this->faker->sentence(3),
            'context' => $this->faker->paragraph(),
            'status' => 'open',
        ];
    }
}
