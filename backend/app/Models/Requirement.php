<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Requirement extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['project_id', 'document_id', 'title', 'requirement_text', 'requirement_type', 'priority', 'confidence_score', 'status', 'source'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    // Persona mapping handled elsewhere; pivot table removed.

    public function conflicts()
    {
        return $this->hasMany(RequirementConflict::class);
    }
}
