<?php

namespace App\Services;

use App\Models\Persona;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;

class PersonaService
{
    /**
     * Get all available personas for a user (predefined + their custom personas)
     *
     * @param int|null $userId
     * @return Collection
     */
    public function getAllPersonas(?int $userId = null): Collection
    {
        $query = Persona::active();

        if ($userId) {
            $query->forUser($userId);
        } else {
            // If no user, only return predefined personas
            $query->predefined();
        }

        return $query->orderBy('type', 'asc')
            ->orderBy('name', 'asc')
            ->get();
    }

    /**
     * Get a specific persona by ID
     *
     * @param int $personaId
     * @param int|null $userId Check ownership for custom personas
     * @return Persona|null
     */
    public function getPersonaById(int $personaId, ?int $userId = null): ?Persona
    {
        $query = Persona::where('id', $personaId);

        if ($userId) {
            // Allow access to predefined or owned custom personas
            $query->where(function ($q) use ($userId) {
                $q->whereNull('user_id')
                  ->orWhere('user_id', $userId);
            });
        }

        return $query->first();
    }

    /**
     * Get predefined personas only
     *
     * @return Collection
     */
    public function getPredefinedPersonas(): Collection
    {
        return Persona::predefined()
            ->active()
            ->orderBy('name', 'asc')
            ->get();
    }

    /**
     * Get custom personas for a user
     *
     * @param int $userId
     * @return Collection
     */
    public function getUserCustomPersonas(int $userId): Collection
    {
        return Persona::custom()
            ->where('user_id', $userId)
            ->active()
            ->orderBy('name', 'asc')
            ->get();
    }

    /**
     * Create a custom persona for a user
     *
     * @param int $userId
     * @param array $data
     * @return Persona
     */
    public function createCustomPersona(int $userId, array $data): Persona
    {
        $persona = new Persona([
            'name' => $data['name'],
            'type' => 'custom',
            'role' => $data['role'] ?? $data['name'],
            'description' => $data['description'] ?? '',
            'priorities' => $data['priorities'] ?? [],
            'concerns' => $data['concerns'] ?? [],
            'typical_requirements' => $data['typical_requirements'] ?? [],
            'communication_style' => $data['communication_style'] ?? 'Professional',
            'technical_level' => $data['technical_level'] ?? 'medium',
            'focus_areas' => $data['focus_areas'] ?? [],
            'example_questions' => $data['example_questions'] ?? [],
            'custom_attributes' => $data['custom_attributes'] ?? [],
            'prompt_template' => $data['prompt_template'] ?? null,
            'is_active' => true,
            'is_predefined' => false,
            'user_id' => $userId,
        ]);

        $persona->save();

        Log::info("Custom persona created", [
            'persona_id' => $persona->id,
            'user_id' => $userId,
            'name' => $persona->name
        ]);

        return $persona;
    }

    /**
     * Update a custom persona (only the owner can update)
     *
     * @param int $personaId
     * @param int $userId
     * @param array $data
     * @return Persona|null
     */
    public function updateCustomPersona(int $personaId, int $userId, array $data): ?Persona
    {
        $persona = Persona::where('id', $personaId)
            ->where('type', 'custom')
            ->where('user_id', $userId)
            ->first();

        if (!$persona) {
            return null;
        }

        // Update allowed fields
        $persona->fill([
            'name' => $data['name'] ?? $persona->name,
            'role' => $data['role'] ?? $persona->role,
            'description' => $data['description'] ?? $persona->description,
            'priorities' => $data['priorities'] ?? $persona->priorities,
            'concerns' => $data['concerns'] ?? $persona->concerns,
            'typical_requirements' => $data['typical_requirements'] ?? $persona->typical_requirements,
            'communication_style' => $data['communication_style'] ?? $persona->communication_style,
            'technical_level' => $data['technical_level'] ?? $persona->technical_level,
            'focus_areas' => $data['focus_areas'] ?? $persona->focus_areas,
            'example_questions' => $data['example_questions'] ?? $persona->example_questions,
            'custom_attributes' => $data['custom_attributes'] ?? $persona->custom_attributes,
            'prompt_template' => $data['prompt_template'] ?? $persona->prompt_template,
        ]);

        $persona->save();

        Log::info("Custom persona updated", [
            'persona_id' => $persona->id,
            'user_id' => $userId
        ]);

        return $persona;
    }

    /**
     * Delete a custom persona (only the owner can delete)
     *
     * @param int $personaId
     * @param int $userId
     * @return bool
     */
    public function deleteCustomPersona(int $personaId, int $userId): bool
    {
        $persona = Persona::where('id', $personaId)
            ->where('type', 'custom')
            ->where('user_id', $userId)
            ->first();

        if (!$persona) {
            return false;
        }

        Log::info("Custom persona deleted", [
            'persona_id' => $persona->id,
            'user_id' => $userId,
            'name' => $persona->name
        ]);

        return $persona->delete();
    }

    /**
     * Generate persona-specific system prompt for LLM
     *
     * @param int $personaId
     * @param string $taskType (generate, analyze, review, refine)
     * @return string|null
     */
    public function generatePersonaPrompt(int $personaId, string $taskType = 'generate'): ?string
    {
        $persona = Persona::find($personaId);

        if (!$persona) {
            return null;
        }

        return $persona->generateSystemPrompt($taskType);
    }

    /**
     * Link a requirement to a persona with an action type
     *
     * @param int $requirementId
     * @param int $personaId
     * @param string $actionType
     * @return void
     */
    public function linkRequirementToPersona(int $requirementId, int $personaId, string $actionType = 'generated'): void
    {
        $requirement = \App\Models\Requirement::find($requirementId);
        $persona = Persona::find($personaId);

        if ($requirement && $persona) {
            // Check if already linked with this action type
            $exists = $requirement->personaRequirements()
                ->where('persona_id', $personaId)
                ->where('action_type', $actionType)
                ->exists();

            if (!$exists) {
                $requirement->personas()->attach($personaId, ['action_type' => $actionType]);
                
                Log::info("Requirement linked to persona", [
                    'requirement_id' => $requirementId,
                    'persona_id' => $personaId,
                    'action_type' => $actionType
                ]);
            }
        }
    }

    /**
     * Get statistics about persona usage
     *
     * @param int $personaId
     * @return array
     */
    public function getPersonaStats(int $personaId): array
    {
        $persona = Persona::withCount(['messages', 'personaRequirements'])->find($personaId);

        if (!$persona) {
            return [];
        }

        return [
            'persona_id' => $persona->id,
            'name' => $persona->name,
            'total_messages' => $persona->messages_count ?? 0,
            'total_requirements' => $persona->persona_requirements_count ?? 0,
            'action_breakdown' => $persona->personaRequirements()
                ->selectRaw('action_type, count(*) as count')
                ->groupBy('action_type')
                ->pluck('count', 'action_type')
                ->toArray()
        ];
    }
}
