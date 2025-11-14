<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Requirement;
use App\Models\RequirementConflict;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\Style\Language;
use Barryvdh\DomPDF\Facade\Pdf;

class ExportController extends Controller
{
    /**
     * Handle OPTIONS preflight requests for CORS
     */
    public function exportOptions()
    {
        return response('', 200)
            ->header('Access-Control-Allow-Origin', 'http://localhost:5173')
            ->header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
            ->header('Access-Control-Max-Age', '86400'); // 24 hours
    }

    /**
     * Export requirements and conflicts for a project
     * GET /api/projects/{project}/export?format={word|pdf|markdown}&include={requirements|conflicts|all}
     */
    public function exportProject(Request $request, $project)
    {
        Log::info('Export route accessed', [
            'user' => $request->user()?->id ?? 'anonymous',
            'project_param' => $project,
            'headers' => $request->headers->all(),
            'query' => $request->query->all()
        ]);

        $request->validate([
            'format' => 'required|in:word,pdf,markdown',
            'include' => 'required|in:requirements,conflicts,all',
        ]);

        try {
            // Handle both Project model and integer ID
            if ($project instanceof Project) {
                $projectModel = $project;
            } else {
                $projectModel = Project::findOrFail($project);
            }
            
            $format = $request->get('format');
            $include = $request->get('include');

            Log::info('Export request received', [
                'project_id' => $projectModel->id,
                'format' => $format,
                'include' => $include,
                'user_id' => $request->user()?->id,
                'request_headers' => $request->headers->all(),
            ]);

            // Gather data based on what to include
            $data = $this->gatherExportData($projectModel, $include);

            Log::info('Export data gathered', [
                'project_id' => $projectModel->id,
                'requirements_count' => $data['requirements']->count(),
                'conflicts_count' => $data['conflicts']->count(),
                'stats' => $data['stats']
            ]);

            // Generate export based on format
            switch ($format) {
                case 'word':
                    return $this->exportToWord($projectModel, $data);
                case 'pdf':
                    return $this->exportToPdf($projectModel, $data);
                case 'markdown':
                    return $this->exportToMarkdown($projectModel, $data);
                default:
                    abort(400, 'Invalid format');
            }

        } catch (\Exception $e) {
            Log::error('Export failed', [
                'project_id' => $project instanceof Project ? $project->id : $project,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Export failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Gather data for export based on inclusion criteria
     */
    private function gatherExportData(Project $project, string $include): array
    {
        $data = [
            'project' => $project,
            'requirements' => collect(),
            'conflicts' => collect(),
            'stats' => []
        ];

        // Get requirements
        if ($include === 'requirements' || $include === 'all') {
            $data['requirements'] = Requirement::where('project_id', $project->id)
                ->with(['document:id,original_filename,filename'])
                ->orderBy('created_at')
                ->get();
        }

        // Get conflicts
        if ($include === 'conflicts' || $include === 'all') {
            $data['conflicts'] = RequirementConflict::whereHas('requirement1', function($query) use ($project) {
                $query->where('project_id', $project->id);
            })
            ->with(['requirement1:id,title,requirement_text,requirement_type,priority', 
                   'requirement2:id,title,requirement_text,requirement_type,priority'])
            ->orderBy('severity', 'desc')
            ->orderBy('created_at')
            ->get();
        }

        // Calculate statistics
        $data['stats'] = [
            'total_requirements' => $data['requirements']->count(),
            'functional_requirements' => $data['requirements']->where('requirement_type', 'functional')->count(),
            'non_functional_requirements' => $data['requirements']->where('requirement_type', 'non-functional')->count(),
            'constraint_requirements' => $data['requirements']->where('requirement_type', 'constraint')->count(),
            'high_priority' => $data['requirements']->where('priority', 'high')->count(),
            'medium_priority' => $data['requirements']->where('priority', 'medium')->count(),
            'low_priority' => $data['requirements']->where('priority', 'low')->count(),
            'total_conflicts' => $data['conflicts']->count(),
            'high_severity_conflicts' => $data['conflicts']->where('severity', 'high')->count(),
            'medium_severity_conflicts' => $data['conflicts']->where('severity', 'medium')->count(),
            'low_severity_conflicts' => $data['conflicts']->where('severity', 'low')->count(),
            'resolved_conflicts' => $data['conflicts']->where('resolution_status', 'resolved')->count(),
            'pending_conflicts' => $data['conflicts']->where('resolution_status', 'pending')->count(),
        ];

        return $data;
    }

    /**
     * Export to Word document
     */
    private function exportToWord(Project $project, array $data)
    {
        $phpWord = new PhpWord();

        // Add document properties
        $properties = $phpWord->getDocInfo();
        $properties->setCreator('LLM4Reqs');
        $properties->setTitle("{$project->name} - Requirements Export");
        $properties->setDescription("Requirements and conflicts export for project: {$project->name}");

        // Create section
        $section = $phpWord->addSection();

        // Title page
        $this->addWordTitle($section, $project, $data);
        
        // Table of contents
        $section->addPageBreak();
        $this->addWordTableOfContents($section, $data);
        
        // Project overview
        $section->addPageBreak();
        $this->addWordProjectOverview($section, $project, $data);

        // Requirements section
        if ($data['requirements']->count() > 0) {
            $section->addPageBreak();
            $this->addWordRequirements($section, $data['requirements']);
        }

        // Conflicts section
        if ($data['conflicts']->count() > 0) {
            $section->addPageBreak();
            $this->addWordConflicts($section, $data['conflicts']);
        }

        // Generate and return file
        $filename = $this->generateFilename($project, 'docx');
        $temp_file = tempnam(sys_get_temp_dir(), 'export_') . '.docx';
        
        $objWriter = IOFactory::createWriter($phpWord, 'Word2007');
        $objWriter->save($temp_file);

        // Read file content and return as binary response
        $content = file_get_contents($temp_file);
        unlink($temp_file); // Clean up temp file
        
        Log::info('Word export generated', [
            'project_id' => $project->id,
            'filename' => $filename,
            'content_length' => strlen($content)
        ]);
        
        return response($content)
            ->header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"')
            ->header('Content-Length', strlen($content))
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0')
            ->header('Access-Control-Allow-Origin', 'http://localhost:5173')
            ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
            ->header('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
    }

    /**
     * Export to PDF
     */
    private function exportToPdf(Project $project, array $data)
    {
        try {
            // Generate HTML content for PDF
            $html = view('exports.requirements-pdf', compact('project', 'data'))->render();
            
            // Generate PDF
            $pdf = Pdf::loadHtml($html)
                ->setPaper('a4')
                ->setOptions([
                    'defaultFont' => 'Arial',
                    'isPhpEnabled' => false,
                    'isRemoteEnabled' => false,
                    'dpi' => 96,
                    'defaultPaperSize' => 'a4',
                ]);

            $filename = $this->generateFilename($project, 'pdf');
            
            // Get PDF content as string
            $content = $pdf->output();
            
            Log::info('PDF export generated', [
                'project_id' => $project->id,
                'filename' => $filename,
                'content_length' => strlen($content)
            ]);
            
            return response($content)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"')
                ->header('Content-Length', strlen($content))
                ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
                ->header('Pragma', 'no-cache')
                ->header('Expires', '0')
                ->header('Access-Control-Allow-Origin', 'http://localhost:5173')
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
                ->header('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
                
        } catch (\Exception $e) {
            Log::error('PDF generation failed', [
                'project_id' => $project->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'PDF generation failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export to Markdown
     */
    private function exportToMarkdown(Project $project, array $data)
    {
        $markdown = $this->generateMarkdownContent($project, $data);
        
        $filename = $this->generateFilename($project, 'md');
        
        Log::info('Markdown export generated', [
            'project_id' => $project->id,
            'filename' => $filename,
            'content_length' => strlen($markdown)
        ]);
        
        return response($markdown, 200, [
            'Content-Type' => 'text/markdown; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Content-Length' => strlen($markdown),
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
            'Access-Control-Allow-Origin' => 'http://localhost:5173',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Expose-Headers' => 'Content-Disposition, Content-Length, Content-Type',
        ]);
    }

    /**
     * Add title page to Word document
     */
    private function addWordTitle($section, Project $project, array $data)
    {
        // Main title
        $titleStyle = ['size' => 24, 'bold' => true, 'color' => '2E5C8A'];
        $centerStyle = ['alignment' => 'center', 'spaceAfter' => 240];
        
        $section->addText($project->name, $titleStyle, $centerStyle);
        $section->addText('Requirements & Conflicts Report', ['size' => 16, 'color' => '666666'], $centerStyle);
        
        // Export info
        $section->addTextBreak(2);
        $infoStyle = ['size' => 10, 'color' => '333333'];
        $section->addText('Generated: ' . now()->format('F j, Y \a\t g:i A'), $infoStyle, ['alignment' => 'center']);
        $section->addText('Exported by: LLM4Reqs', $infoStyle, ['alignment' => 'center']);
        
        // Quick stats
        $section->addTextBreak(3);
        $section->addText('Summary Statistics', ['size' => 14, 'bold' => true], ['alignment' => 'center']);
        $section->addTextBreak();
        
        $statsTable = $section->addTable(['borderSize' => 6, 'borderColor' => 'DDDDDD']);
        $statsTable->addRow();
        $statsTable->addCell(3000)->addText('Total Requirements:', ['bold' => true]);
        $statsTable->addCell(2000)->addText($data['stats']['total_requirements']);
        
        $statsTable->addRow();
        $statsTable->addCell(3000)->addText('Total Conflicts:', ['bold' => true]);
        $statsTable->addCell(2000)->addText($data['stats']['total_conflicts']);
        
        if ($data['requirements']->count() > 0) {
            $statsTable->addRow();
            $statsTable->addCell(3000)->addText('High Priority Requirements:', ['bold' => true]);
            $statsTable->addCell(2000)->addText($data['stats']['high_priority']);
        }
        
        if ($data['conflicts']->count() > 0) {
            $statsTable->addRow();
            $statsTable->addCell(3000)->addText('High Severity Conflicts:', ['bold' => true]);
            $statsTable->addCell(2000)->addText($data['stats']['high_severity_conflicts']);
        }
    }

    /**
     * Add table of contents to Word document
     */
    private function addWordTableOfContents($section, array $data)
    {
        $section->addText('Table of Contents', ['size' => 18, 'bold' => true], ['spaceAfter' => 240]);
        
        $tocItems = [
            '1. Project Overview',
        ];
        
        if ($data['requirements']->count() > 0) {
            $tocItems[] = '2. Requirements Analysis';
            $tocItems[] = '   2.1 Requirements by Type';
            $tocItems[] = '   2.2 Requirements by Priority';
            $tocItems[] = '   2.3 Detailed Requirements List';
        }
        
        if ($data['conflicts']->count() > 0) {
            $nextSection = $data['requirements']->count() > 0 ? 3 : 2;
            $tocItems[] = "{$nextSection}. Conflicts Analysis";
            $tocItems[] = "   {$nextSection}.1 Conflicts by Severity";
            $tocItems[] = "   {$nextSection}.2 Detailed Conflicts List";
        }
        
        foreach ($tocItems as $item) {
            $section->addText($item, [], ['spaceAfter' => 120]);
        }
    }

    /**
     * Add project overview to Word document
     */
    private function addWordProjectOverview($section, Project $project, array $data)
    {
        $section->addText('1. Project Overview', ['size' => 16, 'bold' => true], ['spaceAfter' => 240]);
        
        // Project details
        $section->addText('Project Information', ['size' => 12, 'bold' => true], ['spaceAfter' => 120]);
        $section->addText('Name: ' . $project->name);
        $section->addText('Description: ' . ($project->description ?: 'No description provided'));
        $section->addText('Created: ' . $project->created_at->format('F j, Y'));
        $section->addText('Last Updated: ' . $project->updated_at->format('F j, Y'));
        
        $section->addTextBreak();
        
        // Statistics overview
        $section->addText('Requirements Summary', ['size' => 12, 'bold' => true], ['spaceAfter' => 120]);
        
        if ($data['requirements']->count() > 0) {
            $section->addText("• Total Requirements: {$data['stats']['total_requirements']}");
            $section->addText("• Functional: {$data['stats']['functional_requirements']}");
            $section->addText("• Non-functional: {$data['stats']['non_functional_requirements']}");
            $section->addText("• Constraints: {$data['stats']['constraint_requirements']}");
            $section->addTextBreak();
            $section->addText("• High Priority: {$data['stats']['high_priority']}");
            $section->addText("• Medium Priority: {$data['stats']['medium_priority']}");
            $section->addText("• Low Priority: {$data['stats']['low_priority']}");
        } else {
            $section->addText('No requirements found in this project.');
        }
        
        if ($data['conflicts']->count() > 0) {
            $section->addTextBreak();
            $section->addText('Conflicts Summary', ['size' => 12, 'bold' => true], ['spaceAfter' => 120]);
            $section->addText("• Total Conflicts: {$data['stats']['total_conflicts']}");
            $section->addText("• High Severity: {$data['stats']['high_severity_conflicts']}");
            $section->addText("• Medium Severity: {$data['stats']['medium_severity_conflicts']}");
            $section->addText("• Low Severity: {$data['stats']['low_severity_conflicts']}");
            $section->addTextBreak();
            $section->addText("• Resolved: {$data['stats']['resolved_conflicts']}");
            $section->addText("• Pending: {$data['stats']['pending_conflicts']}");
        }
    }

    /**
     * Add requirements section to Word document
     */
    private function addWordRequirements($section, $requirements)
    {
        $section->addText('2. Requirements Analysis', ['size' => 16, 'bold' => true], ['spaceAfter' => 240]);
        
        // Group by type and priority for analysis
        $byType = $requirements->groupBy('requirement_type');
        $byPriority = $requirements->groupBy('priority');
        
        // Requirements by type
        $section->addText('2.1 Requirements by Type', ['size' => 14, 'bold' => true], ['spaceAfter' => 120]);
        foreach ($byType as $type => $typeRequirements) {
            $section->addText(ucfirst($type) . " Requirements ({$typeRequirements->count()})", ['bold' => true], ['spaceAfter' => 120]);
            foreach ($typeRequirements->take(5) as $req) {
                $section->addText("• [{$req->id}] {$req->title}", [], ['leftIndent' => 360]);
            }
            if ($typeRequirements->count() > 5) {
                $section->addText("... and " . ($typeRequirements->count() - 5) . " more", ['italic' => true], ['leftIndent' => 360]);
            }
            $section->addTextBreak();
        }
        
        // Requirements by priority
        $section->addText('2.2 Requirements by Priority', ['size' => 14, 'bold' => true], ['spaceAfter' => 120]);
        foreach (['high', 'medium', 'low'] as $priority) {
            if ($byPriority->has($priority)) {
                $priorityReqs = $byPriority[$priority];
                $section->addText(ucfirst($priority) . " Priority ({$priorityReqs->count()})", ['bold' => true], ['spaceAfter' => 120]);
                foreach ($priorityReqs->take(3) as $req) {
                    $section->addText("• [{$req->id}] {$req->title}", [], ['leftIndent' => 360]);
                }
                if ($priorityReqs->count() > 3) {
                    $section->addText("... and " . ($priorityReqs->count() - 3) . " more", ['italic' => true], ['leftIndent' => 360]);
                }
                $section->addTextBreak();
            }
        }
        
        // Detailed requirements list
        $section->addText('2.3 Detailed Requirements List', ['size' => 14, 'bold' => true], ['spaceAfter' => 240]);
        
        foreach ($requirements as $requirement) {
            $section->addText("REQ-{$requirement->id}: {$requirement->title}", ['bold' => true], ['spaceAfter' => 120]);
            $section->addText($requirement->requirement_text ?: 'No detailed description available.', [], ['leftIndent' => 360, 'spaceAfter' => 120]);
            
            // Metadata
            $metaText = "Type: {$requirement->requirement_type} | Priority: {$requirement->priority}";
            if ($requirement->confidence_score) {
                $metaText .= " | Confidence: " . round($requirement->confidence_score * 100) . "%";
            }
            if ($requirement->document) {
                $metaText .= " | Source: {$requirement->document->original_filename}";
            }
            $section->addText($metaText, ['size' => 9, 'color' => '666666'], ['leftIndent' => 360, 'spaceAfter' => 240]);
        }
    }

    /**
     * Add conflicts section to Word document
     */
    private function addWordConflicts($section, $conflicts)
    {
        $nextSection = request()->get('include') === 'conflicts' ? 2 : 3;
        $section->addText("{$nextSection}. Conflicts Analysis", ['size' => 16, 'bold' => true], ['spaceAfter' => 240]);
        
        // Group by severity
        $bySeverity = $conflicts->groupBy('severity');
        
        // Conflicts by severity
        $section->addText("{$nextSection}.1 Conflicts by Severity", ['size' => 14, 'bold' => true], ['spaceAfter' => 120]);
        foreach (['high', 'medium', 'low'] as $severity) {
            if ($bySeverity->has($severity)) {
                $severityConflicts = $bySeverity[$severity];
                $section->addText(ucfirst($severity) . " Severity ({$severityConflicts->count()})", ['bold' => true], ['spaceAfter' => 120]);
                foreach ($severityConflicts->take(3) as $conflict) {
                    $section->addText("• REQ-{$conflict->requirement_id_1} ↔ REQ-{$conflict->requirement_id_2}", [], ['leftIndent' => 360]);
                }
                if ($severityConflicts->count() > 3) {
                    $section->addText("... and " . ($severityConflicts->count() - 3) . " more", ['italic' => true], ['leftIndent' => 360]);
                }
                $section->addTextBreak();
            }
        }
        
        // Detailed conflicts list
        $section->addText("{$nextSection}.2 Detailed Conflicts List", ['size' => 14, 'bold' => true], ['spaceAfter' => 240]);
        
        foreach ($conflicts as $index => $conflict) {
            $section->addText("Conflict #" . ($index + 1), ['bold' => true], ['spaceAfter' => 120]);
            $section->addText("Requirements: REQ-{$conflict->requirement_id_1} ↔ REQ-{$conflict->requirement_id_2}", [], ['leftIndent' => 360]);
            $section->addText("Severity: {$conflict->severity} | Confidence: {$conflict->confidence}", [], ['leftIndent' => 360]);
            $section->addText("Description: " . ($conflict->conflict_description ?: 'No description provided'), [], ['leftIndent' => 360, 'spaceAfter' => 120]);
            
            // Show conflicting requirements
            if ($conflict->requirement1) {
                $section->addText("Requirement 1: {$conflict->requirement1->title}", ['bold' => true], ['leftIndent' => 720]);
                $section->addText($conflict->requirement1->requirement_text ?: 'No description', [], ['leftIndent' => 720, 'spaceAfter' => 120]);
            }
            
            if ($conflict->requirement2) {
                $section->addText("Requirement 2: {$conflict->requirement2->title}", ['bold' => true], ['leftIndent' => 720]);
                $section->addText($conflict->requirement2->requirement_text ?: 'No description', [], ['leftIndent' => 720, 'spaceAfter' => 120]);
            }
            
            if ($conflict->resolution_notes) {
                $section->addText("Resolution Notes:", ['bold' => true], ['leftIndent' => 360]);
                $section->addText($conflict->resolution_notes, [], ['leftIndent' => 360]);
            }
            
            $section->addText("Status: {$conflict->resolution_status}", ['size' => 9, 'color' => '666666'], ['leftIndent' => 360, 'spaceAfter' => 360]);
        }
    }

    /**
     * Generate markdown content
     */
    private function generateMarkdownContent(Project $project, array $data): string
    {
        $markdown = "# {$project->name}\n\n";
        $markdown .= "## Requirements & Conflicts Report\n\n";
        $markdown .= "**Generated:** " . now()->format('F j, Y \a\t g:i A') . "\n";
        $markdown .= "**Exported by:** LLM4Reqs\n\n";

        // Table of contents
        $markdown .= "## Table of Contents\n\n";
        $markdown .= "1. [Project Overview](#project-overview)\n";
        if ($data['requirements']->count() > 0) {
            $markdown .= "2. [Requirements Analysis](#requirements-analysis)\n";
            $markdown .= "   - [Requirements by Type](#requirements-by-type)\n";
            $markdown .= "   - [Requirements by Priority](#requirements-by-priority)\n";
            $markdown .= "   - [Detailed Requirements](#detailed-requirements)\n";
        }
        if ($data['conflicts']->count() > 0) {
            $nextSection = $data['requirements']->count() > 0 ? 3 : 2;
            $markdown .= "{$nextSection}. [Conflicts Analysis](#conflicts-analysis)\n";
            $markdown .= "   - [Conflicts by Severity](#conflicts-by-severity)\n";
            $markdown .= "   - [Detailed Conflicts](#detailed-conflicts)\n";
        }
        $markdown .= "\n---\n\n";

        // Project overview
        $markdown .= "## Project Overview\n\n";
        $markdown .= "### Project Information\n\n";
        $markdown .= "- **Name:** {$project->name}\n";
        $markdown .= "- **Description:** " . ($project->description ?: 'No description provided') . "\n";
        $markdown .= "- **Created:** " . $project->created_at->format('F j, Y') . "\n";
        $markdown .= "- **Last Updated:** " . $project->updated_at->format('F j, Y') . "\n\n";

        // Summary statistics
        $markdown .= "### Summary Statistics\n\n";
        $markdown .= "| Metric | Count |\n";
        $markdown .= "|--------|-------|\n";
        $markdown .= "| Total Requirements | {$data['stats']['total_requirements']} |\n";
        if ($data['requirements']->count() > 0) {
            $markdown .= "| Functional Requirements | {$data['stats']['functional_requirements']} |\n";
            $markdown .= "| Non-functional Requirements | {$data['stats']['non_functional_requirements']} |\n";
            $markdown .= "| Constraint Requirements | {$data['stats']['constraint_requirements']} |\n";
            $markdown .= "| High Priority | {$data['stats']['high_priority']} |\n";
            $markdown .= "| Medium Priority | {$data['stats']['medium_priority']} |\n";
            $markdown .= "| Low Priority | {$data['stats']['low_priority']} |\n";
        }
        if ($data['conflicts']->count() > 0) {
            $markdown .= "| Total Conflicts | {$data['stats']['total_conflicts']} |\n";
            $markdown .= "| High Severity Conflicts | {$data['stats']['high_severity_conflicts']} |\n";
            $markdown .= "| Medium Severity Conflicts | {$data['stats']['medium_severity_conflicts']} |\n";
            $markdown .= "| Low Severity Conflicts | {$data['stats']['low_severity_conflicts']} |\n";
            $markdown .= "| Resolved Conflicts | {$data['stats']['resolved_conflicts']} |\n";
            $markdown .= "| Pending Conflicts | {$data['stats']['pending_conflicts']} |\n";
        }
        $markdown .= "\n---\n\n";

        // Requirements section
        if ($data['requirements']->count() > 0) {
            $markdown .= $this->generateMarkdownRequirements($data['requirements']);
        }

        // Conflicts section
        if ($data['conflicts']->count() > 0) {
            $markdown .= $this->generateMarkdownConflicts($data['conflicts'], $data['requirements']->count() > 0);
        }

        return $markdown;
    }

    /**
     * Generate markdown for requirements section
     */
    private function generateMarkdownRequirements($requirements): string
    {
        $markdown = "## Requirements Analysis\n\n";
        
        // Group by type and priority
        $byType = $requirements->groupBy('requirement_type');
        $byPriority = $requirements->groupBy('priority');
        
        // Requirements by type
        $markdown .= "### Requirements by Type\n\n";
        foreach ($byType as $type => $typeRequirements) {
            $markdown .= "#### " . ucfirst($type) . " Requirements ({$typeRequirements->count()})\n\n";
            foreach ($typeRequirements->take(10) as $req) {
                $markdown .= "- **[REQ-{$req->id}]** {$req->title}\n";
            }
            if ($typeRequirements->count() > 10) {
                $markdown .= "\n*... and " . ($typeRequirements->count() - 10) . " more requirements*\n";
            }
            $markdown .= "\n";
        }
        
        // Requirements by priority
        $markdown .= "### Requirements by Priority\n\n";
        foreach (['high', 'medium', 'low'] as $priority) {
            if ($byPriority->has($priority)) {
                $priorityReqs = $byPriority[$priority];
                $markdown .= "#### " . ucfirst($priority) . " Priority ({$priorityReqs->count()})\n\n";
                foreach ($priorityReqs->take(5) as $req) {
                    $markdown .= "- **[REQ-{$req->id}]** {$req->title}\n";
                }
                if ($priorityReqs->count() > 5) {
                    $markdown .= "\n*... and " . ($priorityReqs->count() - 5) . " more requirements*\n";
                }
                $markdown .= "\n";
            }
        }
        
        // Detailed requirements
        $markdown .= "### Detailed Requirements\n\n";
        foreach ($requirements as $requirement) {
            $markdown .= "#### REQ-{$requirement->id}: {$requirement->title}\n\n";
            $markdown .= ($requirement->requirement_text ?: 'No detailed description available.') . "\n\n";
            
            $markdown .= "**Metadata:**\n";
            $markdown .= "- Type: `{$requirement->requirement_type}`\n";
            $markdown .= "- Priority: `{$requirement->priority}`\n";
            if ($requirement->confidence_score) {
                $markdown .= "- Confidence: " . round($requirement->confidence_score * 100) . "%\n";
            }
            if ($requirement->document) {
                $markdown .= "- Source: {$requirement->document->original_filename}\n";
            }
            $markdown .= "- Created: " . $requirement->created_at->format('F j, Y') . "\n\n";
        }
        
        $markdown .= "---\n\n";
        
        return $markdown;
    }

    /**
     * Generate markdown for conflicts section
     */
    private function generateMarkdownConflicts($conflicts, bool $hasRequirements): string
    {
        $sectionNumber = $hasRequirements ? 3 : 2;
        $markdown = "## Conflicts Analysis\n\n";
        
        // Group by severity
        $bySeverity = $conflicts->groupBy('severity');
        
        // Conflicts by severity
        $markdown .= "### Conflicts by Severity\n\n";
        foreach (['high', 'medium', 'low'] as $severity) {
            if ($bySeverity->has($severity)) {
                $severityConflicts = $bySeverity[$severity];
                $markdown .= "#### " . ucfirst($severity) . " Severity ({$severityConflicts->count()})\n\n";
                foreach ($severityConflicts->take(5) as $conflict) {
                    $markdown .= "- **REQ-{$conflict->requirement_id_1}** ↔ **REQ-{$conflict->requirement_id_2}**\n";
                }
                if ($severityConflicts->count() > 5) {
                    $markdown .= "\n*... and " . ($severityConflicts->count() - 5) . " more conflicts*\n";
                }
                $markdown .= "\n";
            }
        }
        
        // Detailed conflicts
        $markdown .= "### Detailed Conflicts\n\n";
        foreach ($conflicts as $index => $conflict) {
            $markdown .= "#### Conflict #" . ($index + 1) . "\n\n";
            $markdown .= "**Requirements:** REQ-{$conflict->requirement_id_1} ↔ REQ-{$conflict->requirement_id_2}\n\n";
            $markdown .= "**Severity:** `{$conflict->severity}` | **Confidence:** `{$conflict->confidence}`\n\n";
            $markdown .= "**Description:** " . ($conflict->conflict_description ?: 'No description provided') . "\n\n";
            
            // Show conflicting requirements
            if ($conflict->requirement1) {
                $markdown .= "##### Requirement 1: {$conflict->requirement1->title}\n\n";
                $markdown .= ($conflict->requirement1->requirement_text ?: 'No description') . "\n\n";
            }
            
            if ($conflict->requirement2) {
                $markdown .= "##### Requirement 2: {$conflict->requirement2->title}\n\n";
                $markdown .= ($conflict->requirement2->requirement_text ?: 'No description') . "\n\n";
            }
            
            if ($conflict->resolution_notes) {
                $markdown .= "**Resolution Notes:**\n\n";
                $markdown .= $conflict->resolution_notes . "\n\n";
            }
            
            $markdown .= "**Status:** `{$conflict->resolution_status}`\n\n";
            $markdown .= "**Detected:** " . ($conflict->detected_at ? $conflict->detected_at->format('F j, Y g:i A') : 'N/A') . "\n\n";
            $markdown .= "---\n\n";
        }
        
        return $markdown;
    }

    /**
     * Generate filename for export
     */
    private function generateFilename(Project $project, string $extension): string
    {
        $safeName = preg_replace('/[^a-zA-Z0-9\-_]/', '_', $project->name);
        $timestamp = now()->format('Y-m-d_H-i-s');
        return "{$safeName}_requirements_export_{$timestamp}.{$extension}";
    }
}