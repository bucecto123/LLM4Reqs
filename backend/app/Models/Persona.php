<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Persona extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'role',
        'description',
        'priorities',
        'concerns',
        'typical_requirements',
        'communication_style',
        'technical_level',
        'focus_areas',
        'example_questions',
        'custom_attributes',
        'prompt_template',
        'is_active',
        'is_predefined',
        'user_id'
    ];

    protected $casts = [
        'priorities' => 'array',
        'concerns' => 'array',
        'typical_requirements' => 'array',
        'focus_areas' => 'array',
        'example_questions' => 'array',
        'custom_attributes' => 'array',
        'is_active' => 'boolean',
        'is_predefined' => 'boolean',
    ];

    /**
     * Relationship: Persona belongs to a user (for custom personas)
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relationship: Persona has many messages
     */
    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    /**
     * Relationship: Persona has many persona-requirements associations
     */
    public function personaRequirements()
    {
        return $this->hasMany(PersonaRequirement::class);
    }

    /**
     * Relationship: Get requirements through pivot
     */
    public function requirements()
    {
        return $this->belongsToMany(Requirement::class, 'persona_requirements')
            ->withPivot('action_type')
            ->withTimestamps();
    }

    /**
     * Scope: Get only predefined personas
     */
    public function scopePredefined($query)
    {
        return $query->where('type', 'predefined');
    }

    /**
     * Scope: Get only custom personas
     */
    public function scopeCustom($query)
    {
        return $query->where('type', 'custom');
    }

    /**
     * Scope: Get active personas
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Get personas for a specific user (including predefined)
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where(function ($q) use ($userId) {
            $q->whereNull('user_id') // Predefined personas
              ->orWhere('user_id', $userId); // User's custom personas
        });
    }

    /**
     * Generate system prompt for this persona
     */
    public function generateSystemPrompt(string $taskType = 'generate'): string
    {
        $prioritiesList = $this->priorities ? implode("\n", array_map(
            fn($p, $i) => ($i + 1) . ". " . $p,
            $this->priorities,
            array_keys($this->priorities)
        )) : '';

        $concernsList = $this->concerns ? implode("\n", array_map(
            fn($c) => "- " . $c,
            $this->concerns
        )) : '';

        $focusList = $this->focus_areas ? implode("\n", array_map(
            fn($f) => "- " . $f,
            $this->focus_areas
        )) : '';

        $prompt = "You are a {$this->role} with the following characteristics:\n\n";
        $prompt .= "**Role & Background:**\n{$this->description}\n\n";
        
        if ($prioritiesList) {
            $prompt .= "**Your Priorities (in order):**\n{$prioritiesList}\n\n";
        }
        
        if ($concernsList) {
            $prompt .= "**Your Main Concerns:**\n{$concernsList}\n\n";
        }
        
        if ($focusList) {
            $prompt .= "**Your Focus Areas:**\n{$focusList}\n\n";
        }
        
        $prompt .= "**Communication Style:**\n{$this->communication_style}\n\n";
        $prompt .= "**Technical Level:** " . strtoupper($this->technical_level) . "\n\n";
        
        $prompt .= "When {$taskType}ing requirements, you should:\n";
        $prompt .= "1. Focus on your priorities and concerns\n";
        $prompt .= "2. Use language appropriate to your technical level\n";
        $prompt .= "3. Think from your role's perspective\n";
        $prompt .= "4. Identify potential issues that matter to someone in your position\n\n";

        return $prompt;
    }
}
