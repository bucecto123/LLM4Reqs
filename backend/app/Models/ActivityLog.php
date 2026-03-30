<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'project_id', 'user_id', 'action_type', 'description', 'metadata', 'created_at'
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Valid action types
    const ACTION_DOCUMENT_UPLOADED = 'document_uploaded';
    const ACTION_REQUIREMENT_CREATED = 'requirement_created';
    const ACTION_REQUIREMENT_UPDATED = 'requirement_updated';
    const ACTION_CONFLICT_DETECTED = 'conflict_detected';
    const ACTION_CONFLICT_RESOLVED = 'conflict_resolved';
    const ACTION_COLLABORATOR_ADDED = 'collaborator_added';
    const ACTION_COLLABORATOR_REMOVED = 'collaborator_removed';
}
