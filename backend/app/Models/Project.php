<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id', 'name', 'description', 'status'
    ];

    /**
     * Boot method to handle cascading soft deletes
     */
    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($project) {
            // When a project is soft-deleted, also soft-delete all related records
            // This ensures data integrity since database cascade only works on hard deletes
            
            // Soft delete requirements (which will cascade to conflicts via Requirement model)
            $project->requirements()->delete();
            
            // Soft delete documents
            $project->documents()->delete();
            
            // Soft delete conversations (which will cascade to messages)
            $project->conversations()->delete();
            
            // Delete knowledge base
            if ($project->knowledgeBase) {
                $project->knowledgeBase()->delete();
            }
            
            // Delete project collaborators
            $project->collaborators()->delete();
            
            // Delete requirement conflicts directly
            $project->requirementConflicts()->delete();
        });
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function collaborators()
    {
        return $this->hasMany(ProjectCollaborator::class);
    }

    public function requirements()
    {
        return $this->hasMany(Requirement::class);
    }

    public function documents()
    {
        return $this->hasMany(Document::class);
    }

    public function conversations()
    {
        return $this->hasMany(Conversation::class);
    }

    public function knowledgeBase()
    {
        return $this->hasOne(KnowledgeBase::class);
    }

    public function requirementConflicts()
    {
        return $this->hasMany(RequirementConflict::class);
    }
}
