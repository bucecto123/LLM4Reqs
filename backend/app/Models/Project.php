<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'owner_id', 'name', 'description', 'status'
    ];

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

    public function knowledgeBase()
    {
        return $this->hasOne(KnowledgeBase::class);
    }

    public function requirementConflicts()
    {
        return $this->hasMany(RequirementConflict::class);
    }
}
