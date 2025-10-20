<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KnowledgeBase extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'status',
        'index_path',
        'meta_path',
        'version',
        'documents_count',
        'last_built_at',
        'last_error',
        'job_id',
    ];

    protected $casts = [
        'last_built_at' => 'datetime',
        'version' => 'integer',
        'documents_count' => 'integer',
    ];

    /**
     * Get the project that owns the knowledge base.
     */
    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Check if the KB is ready for queries.
     */
    public function isReady(): bool
    {
        return $this->status === 'ready';
    }

    /**
     * Mark KB as building.
     */
    public function markAsBuilding(string $jobId = null): void
    {
        $this->update([
            'status' => 'building',
            'job_id' => $jobId,
            'last_error' => null,
        ]);
    }

    /**
     * Mark KB as ready.
     */
    public function markAsReady(array $result): void
    {
        $this->update([
            'status' => 'ready',
            'index_path' => $result['index_path'] ?? null,
            'meta_path' => $result['meta_path'] ?? null,
            'version' => ($this->version ?? 0) + 1,
            'documents_count' => $result['total_chunks'] ?? 0,
            'last_built_at' => now(),
            'last_error' => null,
            'job_id' => null,
        ]);
    }

    /**
     * Mark KB as failed.
     */
    public function markAsFailed(string $error): void
    {
        $this->update([
            'status' => 'failed',
            'last_error' => $error,
            'job_id' => null,
        ]);
    }
}
