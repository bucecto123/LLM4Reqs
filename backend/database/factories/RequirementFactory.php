<?php

namespace Database\Factories;

use App\Models\Requirement;
use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

class RequirementFactory extends Factory
{
    protected $model = Requirement::class;

    public function definition()
    {
        return [
            'project_id' => Project::factory(),
            'title' => $this->faker->sentence(4),
            'requirement_text' => $this->faker->paragraph(),
            'requirement_type' => $this->faker->randomElement(['functional', 'non-functional', 'constraint']),
            'priority' => $this->faker->randomElement(['low', 'medium', 'high']),
            'confidence_score' => $this->faker->randomFloat(2, 0, 1),
            'status' => $this->faker->randomElement(['draft', 'active', 'archived']),
            'source' => 'manual',
        ];
    }
}
