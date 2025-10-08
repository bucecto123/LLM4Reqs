<?php

namespace Database\Factories;

use App\Models\Document;
use App\Models\Project;
use App\Models\User;
use App\Models\Conversation;
use Illuminate\Database\Eloquent\Factories\Factory;

class DocumentFactory extends Factory
{
    protected $model = Document::class;

    public function definition()
    {
        return [
            'project_id' => Project::factory(),
            'conversation_id' => Conversation::factory(),
            'user_id' => User::factory(),
            'filename' => $this->faker->word() . '.pdf',
            'original_filename' => $this->faker->word() . '.pdf',
            'file_path' => '/uploads/' . $this->faker->word() . '.pdf',
            'content' => $this->faker->paragraphs(3, true),
            'file_size' => $this->faker->numberBetween(1000, 1000000),
            'file_type' => 'pdf',
            'status' => 'uploaded',
        ];
    }
}
