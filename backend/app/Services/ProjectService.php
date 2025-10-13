<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Requirement;

class ProjectService
{
    public function createProject($data)
    {
        return Project::create([
            'owner_id' => auth()->id(),
            'name' => $data['name'],
            'description' => $data['description']
        ]);
    }

    public function updateProject($id, $data)
    {
        $project = Project::findOrFail($id);
        $project->update($data);
        return $project;
    }

    public function deleteProject($id)
    {
        $project = Project::findOrFail($id);
        return $project->delete();
    }

    public function getProjectRequirements($id)
    {
        $requirements = Requirement::where('project_id', $id)->get();
        return $requirements;
    }
}
