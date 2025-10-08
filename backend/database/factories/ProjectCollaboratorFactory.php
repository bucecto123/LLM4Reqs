<?php

namespace Database\Factories;

use App\Models\ProjectCollaborator;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProjectCollaboratorFactory extends Factory
{
    protected $model = ProjectCollaborator::class;

    public function definition()
    {
        return [
            'project_id' => Project::factory(),
            'user_id' => User::factory(),
            'role' => 'member',
        ];
    }
}
