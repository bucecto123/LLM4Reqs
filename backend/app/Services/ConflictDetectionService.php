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
        $this->llmBaseUrl = config('services.llm.url', 'http://llm:8000');
        $apiKey = config('services.llm.api_key');
        if (empty($apiKey)) {
            throw new \Exception('LLM_API_KEY not configured');
        }
        $this->apiKey = $apiKey;
    }

    /**
     * Detect conflicts for a project's requirements.
     *
     * @param int $projectId
     * @param \App\Models\KnowledgeBase|null $kb Optional KB instance for progress updates
     * @return array ['job_id' => string, 'status' => string, 'message' => string]
     */
    public function detectConflictsForProject(int $projectId, $kb = null): array
    {
        $project = Project::findOrFail($projectId);
        
        // Get all requirements for the project
        $requirements = Requirement::where('project_id', $projectId)->get();

        if ($requirements->count() < 2) {
            throw new Exception("Need at least 2 requirements to detect conflicts");
        }

        // Format requirements for the LLM API
        // Use requirement_number for display, but keep track of actual database ID
        $formattedRequirements = $requirements->map(function ($req) {
            return [
                'id' => (string)$req->id,  // Use database ID for lookup
                'number' => (string)($req->requirement_number ?? $req->id),  // Display number
                'text' => $req->requirement_text ?? $req->text ?? ''
            ];
        })->toArray();

        Log::info("Formatted requirements for conflict detection", [
            'project_id' => $projectId,
            'requirement_ids' => array_column($formattedRequirements, 'id'),
            'count' => count($formattedRequirements)
        ]);
        
        // Update progress if KB instance provided
        if ($kb) {
            $kb->updateProgress(75, 'processing_conflicts');
        }

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
            
            // Update progress after API call
            if ($kb) {
                $kb->updateProgress(80, 'processing_conflicts');
            }
            
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
                $saved = $this->saveConflicts($projectId, $conflicts, $kb);
                
                // Automatically resolve conflicts if enabled
                $autoResolved = 0;
                if (env('AUTO_RESOLVE_CONFLICTS', false)) {
                    $autoResolved = $this->autoResolveConflicts($projectId);
                    Log::info("Auto-resolved conflicts", [
                        'project_id' => $projectId,
                        'auto_resolved' => $autoResolved
                    ]);
                }
                
                return [
                    'status' => 'completed',
                    'conflicts' => $conflicts,
                    'conflicts_saved' => $saved,
                    'total_conflicts' => count($conflicts),
                    'auto_resolved' => $autoResolved
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
     * @param \App\Models\KnowledgeBase|null $kb Optional KB instance for progress updates
     * @return int Number of conflicts saved
     */
    public function saveConflicts(int $projectId, array $conflicts, $kb = null): int
    {
        $saved = 0;

        Log::info("Saving conflicts", [
            'project_id' => $projectId,
            'conflicts_received' => count($conflicts),
            'conflicts_data' => $conflicts
        ]);
        
        // Update progress if KB instance provided
        if ($kb) {
            $kb->updateProgress(82, 'saving_conflicts');
        }

        foreach ($conflicts as $conflict) {
            try {
                // Parse requirement IDs (remove "REQ_" or "REQ-" prefix if present)
                $req1Id = $conflict['req_id_1'];
                $req2Id = $conflict['req_id_2'];

                // Strip prefixes: "REQ_", "REQ-", or just numeric
                if (is_string($req1Id)) {
                    $req1Id = preg_replace('/^REQ[-_]/i', '', $req1Id);
                    $req1Id = is_numeric($req1Id) ? (int)$req1Id : $req1Id;
                }
                if (is_string($req2Id)) {
                    $req2Id = preg_replace('/^REQ[-_]/i', '', $req2Id);
                    $req2Id = is_numeric($req2Id) ? (int)$req2Id : $req2Id;
                }

                // Find requirements by their IDs
                $req1 = Requirement::find($req1Id);
                $req2 = Requirement::find($req2Id);

                if (!$req1 || !$req2) {
                    Log::warning("Skipping conflict - requirement not found", [
                        'req_id_1_original' => $conflict['req_id_1'],
                        'req_id_1_parsed' => $req1Id,
                        'req_id_2_original' => $conflict['req_id_2'],
                        'req_id_2_parsed' => $req2Id,
                        'req1_found' => (bool)$req1,
                        'req2_found' => (bool)$req2,
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
                        'project_id' => $projectId,
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
     * Get all conflicts for a project with optional pagination.
     *
     * @param int $projectId
     * @param int $perPage
     * @param int $page
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    public function getProjectConflicts(int $projectId, int $perPage = 10, int $page = 1)
    {
        return RequirementConflict::where('project_id', $projectId)
        ->with(['requirement1', 'requirement2'])
        ->orderByRaw("CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 2 END")
        ->orderBy('conflict_number', 'asc')
        ->paginate($perPage, ['*'], 'page', $page);
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

    /**
     * Automatically resolve conflicts for a project using LLM.
     *
     * @param int $projectId
     * @param bool $onlyPending Only resolve pending conflicts (default: true)
     * @return int Number of conflicts auto-resolved
     */
    public function autoResolveConflicts(int $projectId, bool $onlyPending = true): int
    {
        $query = RequirementConflict::whereHas('requirement1', function ($q) use ($projectId) {
            $q->where('project_id', $projectId);
        })->with(['requirement1', 'requirement2']);

        if ($onlyPending) {
            $query->where('resolution_status', 'pending');
        }

        /** @var \Illuminate\Database\Eloquent\Collection<RequirementConflict> $conflicts */
        $conflicts = $query->get();
        $resolved = 0;

        foreach ($conflicts as $conflict) {
            try {
                $resolution = $this->generateResolution($conflict);
                
                if ($resolution) {
                    $conflict->update([
                        'resolution_status' => 'resolved',
                        'resolution_notes' => $resolution['resolution_notes'],
                        'resolved_at' => now(),
                    ]);
                    $resolved++;
                    
                    Log::info("Auto-resolved conflict", [
                        'conflict_id' => $conflict->id,
                        'project_id' => $projectId
                    ]);
                }
            } catch (Exception $e) {
                Log::error("Failed to auto-resolve conflict", [
                    'conflict_id' => $conflict->id,
                    'project_id' => $projectId,
                    'error' => $e->getMessage()
                ]);
                // Continue with next conflict
            }
        }

        return $resolved;
    }

    /**
     * Generate resolution for a conflict using LLM API.
     *
     * @param RequirementConflict $conflict
     * @return array|null ['resolution_notes' => string, 'suggested_action' => string]
     */
    public function generateResolution(RequirementConflict $conflict): ?array
    {
        $req1 = $conflict->requirement1;
        $req2 = $conflict->requirement2;

        if (!$req1 || !$req2) {
            Log::warning("Cannot generate resolution - requirements not found", [
                'conflict_id' => $conflict->id
            ]);
            return null;
        }

        try {
            $response = Http::withHeaders([
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(120)->post("{$this->llmBaseUrl}/api/conflicts/resolve", [
                'requirement_id_1' => $req1->id,
                'requirement_id_2' => $req2->id,
                'req_text_1' => $req1->requirement_text ?? $req1->text ?? $req1->description ?? '',
                'req_text_2' => $req2->requirement_text ?? $req2->text ?? $req2->description ?? '',
                'conflict_description' => $conflict->conflict_description,
                'confidence' => $conflict->confidence ?? 'medium',
            ]);

            if (!$response->successful()) {
                throw new Exception("LLM API error: " . $response->body());
            }

            $data = $response->json();
            
            return [
                'resolution_notes' => $data['resolution_notes'] ?? 'Auto-resolved by system',
                'suggested_action' => $data['suggested_action'] ?? 'Review conflict manually'
            ];

        } catch (Exception $e) {
            Log::error("Failed to generate conflict resolution", [
                'conflict_id' => $conflict->id,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
}
