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
