<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Requirement extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['project_id', 'title', 'content', 'priority', 'confidence_score', 'status'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function personas()
    {
        return $this->belongsToMany(Persona::class, 'requirement_personas');
    }

    public function conflicts()
    {
        return $this->hasMany(RequirementConflict::class);
    }
}
