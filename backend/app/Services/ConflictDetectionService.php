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

        Log::info("Formatted requirements for conflict detection", [
            'project_id' => $projectId,
            'requirement_ids' => array_column($formattedRequirements, 'id'),
            'count' => count($formattedRequirements)
        ]);

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
            
            // LLM API returns conflicts directly (synchronous)
            if (isset($data['conflicts'])) {
                Log::info("Conflict detection completed", [
                    'project_id' => $projectId,
                    'conflicts_found' => count($data['conflicts']),
                    'requirements_count' => count($formattedRequirements)
                ]);
                
                // Convert response format to match expected format
                $conflicts = [];
                foreach ($data['conflicts'] as $conflict) {
                    $conflicts[] = [
                        'req_id_1' => $conflict['requirement_id_1'] ?? $conflict['req_id_1'] ?? null,
                        'req_id_2' => $conflict['requirement_id_2'] ?? $conflict['req_id_2'] ?? null,
                        'req_text_1' => $conflict['req_text_1'] ?? '',
                        'req_text_2' => $conflict['req_text_2'] ?? '',
                        'reason' => $conflict['conflict_description'] ?? $conflict['reason'] ?? '',
                        'confidence' => $conflict['confidence'] ?? $this->mapSeverityToConfidence($conflict['severity'] ?? 'medium'),
                        'cluster_id' => $conflict['cluster_id'] ?? 0,
                    ];
                }
                
                // Save conflicts immediately
                $saved = $this->saveConflicts($projectId, $conflicts);
                
                return [
                    'status' => 'completed',
                    'conflicts' => $conflicts,
                    'conflicts_saved' => $saved,
                    'total_conflicts' => count($conflicts)
                ];
            }
            
            // No conflicts found
            Log::info("No conflicts detected", [
                'project_id' => $projectId,
                'requirements_count' => count($formattedRequirements)
            ]);

            return [
                'status' => 'completed',
                'conflicts' => [],
                'conflicts_saved' => 0,
                'total_conflicts' => 0
            ];

        } catch (Exception $e) {
            Log::error("Conflict detection failed", [
                'project_id' => $projectId,
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

        Log::info("Saving conflicts", [
            'project_id' => $projectId,
            'conflicts_received' => count($conflicts),
            'conflicts_data' => $conflicts
        ]);

        foreach ($conflicts as $conflict) {
            try {
                // Parse requirement IDs (remove "REQ_" prefix if present)
                $req1Id = $conflict['req_id_1'];
                $req2Id = $conflict['req_id_2'];
                
                // Strip "REQ_" prefix if it exists
                if (is_string($req1Id) && str_starts_with($req1Id, 'REQ_')) {
                    $req1Id = (int)substr($req1Id, 4);
                }
                if (is_string($req2Id) && str_starts_with($req2Id, 'REQ_')) {
                    $req2Id = (int)substr($req2Id, 4);
                }
                
                // Find requirements by their IDs
                $req1 = Requirement::find($req1Id);
                $req2 = Requirement::find($req2Id);

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
     * Map severity level to confidence.
     *
     * @param string $severity
     * @return string
     */
    protected function mapSeverityToConfidence(string $severity): string
    {
        return match($severity) {
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
