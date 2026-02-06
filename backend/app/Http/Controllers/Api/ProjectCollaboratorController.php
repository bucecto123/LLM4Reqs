<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectCollaborator;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ProjectCollaboratorController extends Controller
{
    /**
     * List all collaborators for a project
     */
    public function index(Request $request, $projectId)
    {
        $project = Project::findOrFail($projectId);
        
        // Check authorization
        if (!$request->user()->can('view', $project)) {
            return response()->json([
                'message' => 'Unauthorized to view project collaborators'
            ], 403);
        }

        $collaborators = $project->collaborators()
            ->with('user:id,name,email')
            ->get()
            ->map(function ($collaborator) {
                return [
                    'id' => $collaborator->id,
                    'user_id' => $collaborator->user_id,
                    'name' => $collaborator->user->name,
                    'email' => $collaborator->user->email,
                    'role' => $collaborator->role,
                    'joined_at' => $collaborator->created_at
                ];
            });

        // Include project owner
        $owner = [
            'id' => null, // Owner doesn't have collaborator record
            'user_id' => $project->owner_id,
            'name' => $project->owner->name,
            'email' => $project->owner->email,
            'role' => 'owner',
            'joined_at' => $project->created_at
        ];

        return response()->json([
            'owner' => $owner,
            'collaborators' => $collaborators
        ]);
    }

    /**
     * Add a collaborator to the project
     */
    public function store(Request $request, $projectId)
    {
        $project = Project::findOrFail($projectId);
        
        // Check authorization
        if (!$request->user()->can('manageCollaborators', $project)) {
            return response()->json([
                'message' => 'Unauthorized to add collaborators'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
            'role' => ['required', Rule::in(['owner', 'editor', 'viewer'])]
        ], [
            'email.exists' => 'User with this email address was not found. Please ask them to sign up first.'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Find user by email
        $user = User::where('email', $request->email)->first();

        // Check if user is the project owner
        if ($user->id === $project->owner_id) {
            return response()->json([
                'message' => 'User is already the project owner'
            ], 400);
        }

        // Check if user is already a collaborator
        $existingCollaborator = ProjectCollaborator::where('project_id', $project->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existingCollaborator) {
            return response()->json([
                'message' => 'User is already a collaborator'
            ], 400);
        }

        // Create collaborator
        $collaborator = ProjectCollaborator::create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'role' => $request->role
        ]);

        $collaborator->load('user:id,name,email');

        return response()->json([
            'message' => 'Collaborator added successfully',
            'collaborator' => [
                'id' => $collaborator->id,
                'user_id' => $collaborator->user_id,
                'name' => $collaborator->user->name,
                'email' => $collaborator->user->email,
                'role' => $collaborator->role,
                'joined_at' => $collaborator->created_at
            ]
        ], 201);
    }

    /**
     * Update a collaborator's role
     */
    public function update(Request $request, $projectId, $collaboratorId)
    {
        $project = Project::findOrFail($projectId);
        
        // Check authorization
        if (!$request->user()->can('manageCollaborators', $project)) {
            return response()->json([
                'message' => 'Unauthorized to update collaborators'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'role' => ['required', Rule::in(['owner', 'editor', 'viewer'])]
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $collaborator = ProjectCollaborator::where('project_id', $project->id)
            ->where('id', $collaboratorId)
            ->firstOrFail();

        $collaborator->update(['role' => $request->role]);
        $collaborator->load('user:id,name,email');

        return response()->json([
            'message' => 'Collaborator role updated successfully',
            'collaborator' => [
                'id' => $collaborator->id,
                'user_id' => $collaborator->user_id,
                'name' => $collaborator->user->name,
                'email' => $collaborator->user->email,
                'role' => $collaborator->role,
                'joined_at' => $collaborator->created_at
            ]
        ]);
    }

    /**
     * Remove a collaborator from the project
     */
    public function destroy(Request $request, $projectId, $collaboratorId)
    {
        $project = Project::findOrFail($projectId);
        
        // Check authorization
        if (!$request->user()->can('manageCollaborators', $project)) {
            return response()->json([
                'message' => 'Unauthorized to remove collaborators'
            ], 403);
        }

        $collaborator = ProjectCollaborator::where('project_id', $project->id)
            ->where('id', $collaboratorId)
            ->firstOrFail();

        $collaborator->delete();

        return response()->json([
            'message' => 'Collaborator removed successfully'
        ], 200);
    }
}
