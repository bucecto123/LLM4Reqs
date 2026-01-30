<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ProjectPolicy
{
    use HandlesAuthorization;

    /**
     * Determine if the user can view the project
     */
    public function view(User $user, Project $project): bool
    {
        // Owner can always view
        if ($project->owner_id === $user->id) {
            return true;
        }

        // Check if user is a collaborator with any role
        return $project->collaborators()
            ->where('user_id', $user->id)
            ->whereIn('role', ['owner', 'editor', 'viewer'])
            ->exists();
    }

    /**
     * Determine if the user can update the project
     */
    public function update(User $user, Project $project): bool
    {
        // Owner can always update
        if ($project->owner_id === $user->id) {
            return true;
        }

        // Check if user is an editor or owner collaborator
        return $project->collaborators()
            ->where('user_id', $user->id)
            ->whereIn('role', ['owner', 'editor'])
            ->exists();
    }

    /**
     * Determine if the user can delete the project
     */
    public function delete(User $user, Project $project): bool
    {
        // Only the owner can delete
        return $project->owner_id === $user->id;
    }

    /**
     * Determine if the user can manage collaborators (invite, remove, update roles)
     */
    public function manageCollaborators(User $user, Project $project): bool
    {
        // Owner can always manage collaborators
        if ($project->owner_id === $user->id) {
            return true;
        }

        // Check if user is an owner-role collaborator
        return $project->collaborators()
            ->where('user_id', $user->id)
            ->where('role', 'owner')
            ->exists();
    }

    /**
     * Determine if the user can view project resources (documents, requirements, etc.)
     */
    public function viewResources(User $user, Project $project): bool
    {
        return $this->view($user, $project);
    }

    /**
     * Determine if the user can modify project resources
     */
    public function modifyResources(User $user, Project $project): bool
    {
        return $this->update($user, $project);
    }
}
