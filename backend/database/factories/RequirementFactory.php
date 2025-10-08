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
            'content' => $this->faker->paragraph(),
            'priority' => 'medium',
            'confidence_score' => $this->faker->randomFloat(2, 0, 1),
            'status' => 'draft',
        ];
    }
}
