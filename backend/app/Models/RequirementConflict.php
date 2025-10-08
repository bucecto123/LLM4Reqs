<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RequirementConflict extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id', 'requirement_id_1', 'requirement_id_2', 'conflict_description', 'severity', 'resolution_status', 'resolution_notes', 'resolved_at'
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
