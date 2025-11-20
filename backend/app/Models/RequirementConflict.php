<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RequirementConflict extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'conflict_number',
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

    /**
     * Boot method to auto-assign conflict_number
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($conflict) {
            if (!$conflict->conflict_number && $conflict->project_id) {
                // Get the next sequential number for this project
                $maxNumber = static::where('project_id', $conflict->project_id)
                    ->max('conflict_number') ?? 0;
                $conflict->conflict_number = $maxNumber + 1;
            }
        });
    }

    /**
     * Renumber conflicts for a project so conflict_number is contiguous (1..N)
     * after deletions.
     */
    public static function renumberForProject(int $projectId): void
    {
        $counter = 1;

        static::where('project_id', $projectId)
            ->orderBy('conflict_number')
            ->orderBy('id')
            ->chunkById(100, function ($conflicts) use (&$counter) {
                foreach ($conflicts as $conflict) {
                    if ($conflict->conflict_number !== $counter) {
                        $conflict->conflict_number = $counter;
                        $conflict->save();
                    }
                    $counter++;
                }
            });
    }

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
