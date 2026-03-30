<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'type', 'title', 'message', 'data', 'read_at',
    ];

    protected $casts = [
        'data' => 'array',
        'read_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function markAsRead()
    {
        $this->update(['read_at' => now()]);
    }

    // Convenience factory methods
    public static function collaboratorAdded(int $userId, string $projectName, string $invitedBy): self
    {
        return static::create([
            'user_id' => $userId,
            'type' => 'collaborator_added',
            'title' => "Added to project",
            'message' => "You were added to '{$projectName}' by {$invitedBy}.",
            'data' => ['project_name' => $projectName, 'invited_by' => $invitedBy],
        ]);
    }

    public static function documentProcessed(int $userId, string $projectName, int $requirementsCount): self
    {
        return static::create([
            'user_id' => $userId,
            'type' => 'document_processed',
            'title' => "Document processed",
            'message' => "A document in '{$projectName}' was processed. {$requirementsCount} requirement(s) extracted.",
            'data' => ['project_name' => $projectName, 'requirements_count' => $requirementsCount],
        ]);
    }

    public static function conflictDetected(int $userId, string $projectName, int $conflictCount): self
    {
        return static::create([
            'user_id' => $userId,
            'type' => 'conflict_detected',
            'title' => "Conflicts detected",
            'message' => "{$conflictCount} conflict(s) detected in '{$projectName}'. Review them soon.",
            'data' => ['project_name' => $projectName, 'conflict_count' => $conflictCount],
        ]);
    }
}
