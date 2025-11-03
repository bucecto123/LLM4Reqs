<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Requirement;
use App\Models\RequirementConflict;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class ConflictDetectionService
{
    protected $llmBaseUrl;
    protected $apiKey;

    public function __construct()
    {
        $this->llmBaseUrl = env('LLM_API_URL', 'http://localhost:8000');
        $this->apiKey = env('LLM_API_KEY', 'dev-secret-key-12345');
    }

    /**
     * Detect conflicts for a project's requirements.
     *
     * @param int $projectId
     * @return array ['job_id' => string, 'status' => string, 'message' => string]
     */
    public function detectConflictsForProject(int $projectId): array
    {
        $project = Project::findOrFail($projectId);
        
        // Get all requirements for the project
        $requirements = Requirement::where('project_id', $projectId)->get();

        if ($requirements->count() < 2) {
            throw new Exception("Need at least 2 requirements to detect conflicts");
        }

        // Format requirements for the LLM API
        $formattedRequirements = $requirements->map(function ($req) {
            return [
                'id' => (string)$req->id,
                'text' => $req->requirement_text ?? $req->text ?? ''
            ];
        })->toArray();

        // Call LLM API to detect conflicts
        try {
            $response = Http::withHeaders([
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(300)->post("{$this->llmBaseUrl}/api/conflicts/detect", [
                'project_id' => $projectId,
                'requirements' => $formattedRequirements,
                'min_cluster_size' => 2,
                'max_batch_size' => 30,
            ]);

            if (!$response->successful()) {
                throw new Exception("LLM API error: " . $response->body());
            }

            $data = $response->json();
            
            Log::info("Conflict detection started", [
                'project_id' => $projectId,
                'job_id' => $data['job_id'],
                'requirements_count' => count($formattedRequirements)
            ]);

            return $data;

        } catch (Exception $e) {
            Log::error("Conflict detection failed", [
                'project_id' => $projectId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Check the status of a conflict detection job.
     *
     * @param string $jobId
     * @return array
     */
    public function getJobStatus(string $jobId): array
    {
        try {
            $response = Http::withHeaders([
                'X-API-Key' => $this->apiKey,
            ])->get("{$this->llmBaseUrl}/api/conflicts/status/{$jobId}");

            if (!$response->successful()) {
                throw new Exception("Failed to get job status: " . $response->body());
            }

            return $response->json();

        } catch (Exception $e) {
            Log::error("Failed to get conflict job status", [
                'job_id' => $jobId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Save detected conflicts to the database.
     *
     * @param int $projectId
     * @param array $conflicts
     * @return int Number of conflicts saved
     */
    public function saveConflicts(int $projectId, array $conflicts): int
    {
        $saved = 0;

        foreach ($conflicts as $conflict) {
            try {
                // Find requirements by their IDs
                $req1 = Requirement::find($conflict['req_id_1']);
                $req2 = Requirement::find($conflict['req_id_2']);

                if (!$req1 || !$req2) {
                    Log::warning("Skipping conflict - requirement not found", [
                        'req_id_1' => $conflict['req_id_1'],
                        'req_id_2' => $conflict['req_id_2']
                    ]);
                    continue;
                }

                // Check if conflict already exists
                $existing = RequirementConflict::where(function ($query) use ($req1, $req2) {
                    $query->where('requirement_id_1', $req1->id)
                          ->where('requirement_id_2', $req2->id);
                })->orWhere(function ($query) use ($req1, $req2) {
                    $query->where('requirement_id_1', $req2->id)
                          ->where('requirement_id_2', $req1->id);
                })->first();

                if ($existing) {
                    // Update existing conflict
                    $existing->update([
                        'conflict_description' => $conflict['reason'],
                        'confidence' => $conflict['confidence'],
                        'cluster_id' => $conflict['cluster_id'],
                        'severity' => $this->mapConfidenceToSeverity($conflict['confidence']),
                        'detected_at' => now(),
                    ]);
                } else {
                    // Create new conflict
                    RequirementConflict::create([
                        'requirement_id_1' => $req1->id,
                        'requirement_id_2' => $req2->id,
                        'conflict_description' => $conflict['reason'],
                        'confidence' => $conflict['confidence'],
                        'cluster_id' => $conflict['cluster_id'],
                        'severity' => $this->mapConfidenceToSeverity($conflict['confidence']),
                        'resolution_status' => 'pending',
                        'detected_at' => now(),
                    ]);
                }

                $saved++;

            } catch (Exception $e) {
                Log::error("Failed to save conflict", [
                    'conflict' => $conflict,
                    'error' => $e->getMessage()
                ]);
            }
        }

        Log::info("Conflicts saved to database", [
            'project_id' => $projectId,
            'saved' => $saved,
            'total' => count($conflicts)
        ]);

        return $saved;
    }

    /**
     * Poll for job completion and save results.
     *
     * @param int $projectId
     * @param string $jobId
     * @param int $maxAttempts
     * @param int $delaySeconds
     * @return array
     */
    public function pollAndSaveConflicts(
        int $projectId,
        string $jobId,
        int $maxAttempts = 60,
        int $delaySeconds = 2
    ): array {
        for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
            $status = $this->getJobStatus($jobId);

            if ($status['status'] === 'completed') {
                // Save conflicts to database
                $conflicts = $status['conflicts'] ?? [];
                $saved = $this->saveConflicts($projectId, $conflicts);

                return [
                    'status' => 'completed',
                    'conflicts_found' => count($conflicts),
                    'conflicts_saved' => $saved,
                    'metadata' => $status['metadata'] ?? null
                ];
            }

            if ($status['status'] === 'failed') {
                throw new Exception("Conflict detection failed: " . ($status['error'] ?? 'Unknown error'));
            }

            // Wait before next poll
            sleep($delaySeconds);
        }

        throw new Exception("Conflict detection timed out after {$maxAttempts} attempts");
    }

    /**
     * Map confidence level to severity.
     *
     * @param string $confidence
     * @return string
     */
    protected function mapConfidenceToSeverity(string $confidence): string
    {
        return match($confidence) {
            'high' => 'high',
            'medium' => 'medium',
            'low' => 'low',
            default => 'medium'
        };
    }

    /**
     * Get all conflicts for a project.
     *
     * @param int $projectId
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getProjectConflicts(int $projectId)
    {
        return RequirementConflict::whereHas('requirement1', function ($query) use ($projectId) {
            $query->where('project_id', $projectId);
        })
        ->with(['requirement1', 'requirement2'])
        ->orderBy('severity', 'desc')
        ->orderBy('detected_at', 'desc')
        ->get();
    }

    /**
     * Resolve a conflict.
     *
     * @param int $conflictId
     * @param string $resolutionNotes
     * @return RequirementConflict
     */
    public function resolveConflict(int $conflictId, string $resolutionNotes): RequirementConflict
    {
        $conflict = RequirementConflict::findOrFail($conflictId);
        
        $conflict->update([
            'resolution_status' => 'resolved',
            'resolution_notes' => $resolutionNotes,
            'resolved_at' => now(),
        ]);

        return $conflict;
    }
}
