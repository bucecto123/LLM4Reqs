<?php

namespace App\Services;

use App\Models\Requirement;

class RequirementImportService
{
    public array $errors = [];
    public int $imported = 0;
    public int $skipped = 0;

    /**
     * Import requirements from an array of row arrays.
     * Expected CSV columns (header row): title, requirement_text, requirement_type, priority, status
     */
    public function import(int $projectId, array $rows): array
    {
        $this->errors = [];
        $this->imported = 0;
        $this->skipped = 0;

        $validTypes = ['functional', 'non-functional', 'performance', 'security', 'usability', 'reliability', 'constraint'];
        $validPriorities = ['critical', 'high', 'medium', 'low'];
        $validStatuses = ['draft', 'in_review', 'approved', 'rejected'];

        $existingNumbers = Requirement::where('project_id', $projectId)
            ->pluck('requirement_number')
            ->toArray();
        $maxNumber = count($existingNumbers) > 0 ? max($existingNumbers) : 0;

        foreach ($rows as $index => $row) {
            $lineNum = $index + 2; // +2 because array is 0-indexed and CSV has header row

            // Skip empty rows
            $title = trim($row['title'] ?? '');
            $reqText = trim($row['requirement_text'] ?? '');
            if (empty($title) && empty($reqText)) {
                $this->skipped++;
                continue;
            }

            // Validate required fields
            if (empty($title)) {
                $this->errors[] = "Row {$lineNum}: 'title' is required.";
                $this->skipped++;
                continue;
            }
            if (empty($reqText)) {
                $this->errors[] = "Row {$lineNum}: 'requirement_text' is required.";
                $this->skipped++;
                continue;
            }

            // Normalize and validate
            $type = strtolower(trim($row['requirement_type'] ?? 'functional'));
            if (!in_array($type, $validTypes)) {
                $type = 'functional';
            }
            $priority = strtolower(trim($row['priority'] ?? 'medium'));
            if (!in_array($priority, $validPriorities)) {
                $priority = 'medium';
            }
            $status = strtolower(trim($row['status'] ?? 'draft'));
            if (!in_array($status, $validStatuses)) {
                $status = 'draft';
            }

            $maxNumber++;
            try {
                Requirement::create([
                    'project_id' => $projectId,
                    'requirement_number' => $maxNumber,
                    'title' => mb_substr($title, 0, 200, 'UTF-8'),
                    'requirement_text' => $reqText,
                    'requirement_type' => $type,
                    'priority' => $priority,
                    'status' => $status,
                    'source' => 'imported',
                ]);
                $this->imported++;
            } catch (\Exception $e) {
                $this->errors[] = "Row {$lineNum}: Failed to save — " . $e->getMessage();
                $this->skipped++;
            }
        }

        return [
            'imported' => $this->imported,
            'skipped' => $this->skipped,
            'errors' => $this->errors,
        ];
    }
}
