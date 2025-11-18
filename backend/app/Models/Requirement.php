<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Requirement extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'project_id',
        'document_id',
        'requirement_number',
        'title',
        'content',
        'requirement_text',
        'requirement_type',
        'priority',
        'confidence_score',
        'status',
        'source',
        'source_doc',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
        'confidence_score' => 'float',
    ];

    /**
     * Boot method to auto-assign requirement_number
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($requirement) {
            if (!$requirement->requirement_number && $requirement->project_id) {
                // Get the next sequential number for this project
                $maxNumber = static::where('project_id', $requirement->project_id)
                    ->max('requirement_number') ?? 0;
                $requirement->requirement_number = $maxNumber + 1;
            }
        });
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    /**
     * Relationship: Requirements can be associated with personas
     */
    public function personas()
    {
        return $this->belongsToMany(Persona::class, 'persona_requirements')
            ->withPivot('action_type')
            ->withTimestamps();
    }

    /**
     * Relationship: Requirements can have persona-requirement associations
     */
    public function personaRequirements()
    {
        return $this->hasMany(PersonaRequirement::class);
    }

    public function conflicts()
    {
        return $this->hasMany(RequirementConflict::class);
    }
}
