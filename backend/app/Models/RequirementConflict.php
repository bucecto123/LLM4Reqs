<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RequirementConflict extends Model
{
    use HasFactory;

    protected $fillable = [
        'requirement_id_1',
        'requirement_id_2',
        'conflict_description',
        'confidence',
        'cluster_id',
        'severity',
        'resolution_status',
        'resolution_notes',
        'detected_at',
        'resolved_at'
    ];

    protected $casts = [
        'detected_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function requirement1()
    {
        return $this->belongsTo(Requirement::class, 'requirement_id_1');
    }

    public function requirement2()
    {
        return $this->belongsTo(Requirement::class, 'requirement_id_2');
    }
}
