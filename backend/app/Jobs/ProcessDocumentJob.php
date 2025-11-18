<?php

namespace App\Jobs;

use App\Models\Document;
use App\Models\Requirement;
use App\Services\LLMService;
use App\Utils\TextCommons;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessDocumentJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $documentId;
    public int $tries = 3;
    public array $backoff = [10, 30, 90];
    public int $timeout = 180;

    public function __construct(int $documentId)
    {
        $this->documentId = $documentId;
    }

    public function uniqueId(): string
    {
        return 'process_document_' . $this->documentId;
    }

    public function handle(LLMService $llmService, TextCommons $textCommons): void
    {
        $document = Document::find($this->documentId);

        if (!$document) {
            Log::warning('ProcessDocumentJob: Document not found', ['document_id' => $this->documentId]);
            return;
        }

        Log::info('ProcessDocumentJob: Starting processing', [
            'document_id' => $document->id,
            'project_id' => $document->project_id,
            'filename' => $document->original_filename,
            'content_length' => mb_strlen($document->content ?? '', 'UTF-8')
        ]);

        // Check if already processed with requirements
        $existingCount = Requirement::where('document_id', $document->id)
            ->where('source', 'extracted')
            ->count();
            
        if ($document->status === 'processed' && $existingCount > 0) {
            Log::info('ProcessDocumentJob: Document already processed, skipping', [
                'document_id' => $document->id,
                'existing_requirements' => $existingCount
            ]);
            return;
        }

        if (empty($document->content)) {
            Log::error('ProcessDocumentJob: Document has no content', [
                'document_id' => $document->id,
                'filename' => $document->original_filename
            ]);
            $document->update(['status' => 'failed']);
            return;
        }

        try {
            // Mark as processing
            $document->update(['status' => 'processing']);

            // Clean and prepare content
            $content = $textCommons->cleanUtf8Content((string)($document->content ?? ''));
            
            Log::info('ProcessDocumentJob: Content prepared', [
                'document_id' => $document->id,
                'original_length' => mb_strlen($document->content ?? '', 'UTF-8'),
                'cleaned_length' => mb_strlen($content, 'UTF-8')
            ]);

            // Truncate if too long (keep more content for better extraction)
            // Adjust based on content complexity
            $maxLength = 10000; // Reduced to ensure LLM response fits within token limits
            
            if (mb_strlen($content, 'UTF-8') > $maxLength) {
                $content = mb_substr($content, 0, $maxLength, 'UTF-8') . "\n... [Document truncated for processing]";
                Log::info('ProcessDocumentJob: Content truncated', [
                    'document_id' => $document->id,
                    'final_length' => mb_strlen($content, 'UTF-8')
                ]);
            }

            // Call LLM service to extract requirements
            Log::info('ProcessDocumentJob: Calling LLM service', [
                'document_id' => $document->id,
                'service_url' => config('services.llm.url'),
                'content_length' => mb_strlen($content, 'UTF-8')
            ]);

            try {
                $result = $llmService->extractRequirements(
                    $content,
                    (string)($document->file_type ?? 'text/plain')
                );
            } catch (\Exception $llmError) {
                Log::error('ProcessDocumentJob: LLM service error', [
                    'document_id' => $document->id,
                    'error' => $llmError->getMessage()
                ]);
                
                // Check if it's a parsing error - might indicate content was too long
                if (str_contains($llmError->getMessage(), 'Failed to parse')) {
                    Log::warning('ProcessDocumentJob: Retrying with shorter content', [
                        'document_id' => $document->id,
                        'original_length' => mb_strlen($content, 'UTF-8')
                    ]);
                    
                    // Retry with significantly shorter content
                    $shorterContent = mb_substr($content, 0, 6000, 'UTF-8') . "\n... [Document further truncated due to processing constraints]";
                    
                    try {
                        $result = $llmService->extractRequirements(
                            $shorterContent,
                            (string)($document->file_type ?? 'text/plain')
                        );
                        
                        Log::info('ProcessDocumentJob: Retry successful with shorter content', [
                            'document_id' => $document->id,
                            'shorter_length' => mb_strlen($shorterContent, 'UTF-8')
                        ]);
                    } catch (\Exception $retryError) {
                        Log::error('ProcessDocumentJob: Retry also failed', [
                            'document_id' => $document->id,
                            'error' => $retryError->getMessage()
                        ]);
                        throw $retryError;
                    }
                } else {
                    throw $llmError;
                }
            }

            Log::info('ProcessDocumentJob: LLM extraction complete', [
                'document_id' => $document->id,
                'result_keys' => array_keys($result),
                'requirements_count' => count($result['requirements'] ?? [])
            ]);

            // Clear previous extracted requirements if re-running
            if ($existingCount > 0) {
                Log::info('ProcessDocumentJob: Clearing previous requirements', [
                    'document_id' => $document->id,
                    'count' => $existingCount
                ]);
                Requirement::where('document_id', $document->id)
                    ->where('source', 'extracted')
                    ->delete();
            }

            // Persist requirements
            $savedCount = 0;
            if (!empty($result['requirements']) && is_array($result['requirements'])) {
                Log::info('ProcessDocumentJob: Processing requirements', [
                    'document_id' => $document->id,
                    'count' => count($result['requirements'])
                ]);
                
                foreach ($result['requirements'] as $index => $req) {
                    try {
                        // Extract requirement text with fallbacks
                        $reqText = $req['requirement_text'] ?? 
                                   $req['text'] ?? 
                                   $req['content'] ?? 
                                   null;
                        
                        if (empty($reqText)) {
                            Log::warning('ProcessDocumentJob: Skipping requirement with no text', [
                                'document_id' => $document->id,
                                'index' => $index,
                                'req_keys' => array_keys($req)
                            ]);
                            continue;
                        }

                        // Clean requirement text
                        $reqText = trim($reqText);
                        
                        // Generate title from requirement text if not provided
                        $title = $req['title'] ?? null;
                        if (empty($title)) {
                            $title = 'REQ-' . ($index + 1) . ': ' . 
                                    (mb_strlen($reqText, 'UTF-8') > 50 
                                        ? mb_substr($reqText, 0, 50, 'UTF-8') . '...'
                                        : $reqText);
                        }
                        
                        // Prepare requirement data
                        $data = [
                            'project_id' => $document->project_id,
                            'document_id' => $document->id,
                            'title' => $title,
                            'requirement_text' => $reqText,
                            'requirement_type' => $req['requirement_type'] ?? 
                                                 $req['type'] ?? 
                                                 'functional',
                            'priority' => $req['priority'] ?? 'medium',
                            'confidence_score' => floatval($req['confidence_score'] ?? 
                                                          $req['confidence'] ?? 
                                                          0.8),
                            'source' => 'extracted',
                            'status' => $req['status'] ?? 'draft',
                        ];
                        
                        Log::info('ProcessDocumentJob: Creating requirement', [
                            'document_id' => $document->id,
                            'index' => $index,
                            'title' => $data['title'],
                            'type' => $data['requirement_type'],
                            'priority' => $data['priority']
                        ]);
                        
                        $requirement = Requirement::create($data);
                        
                        if ($requirement) {
                            $savedCount++;
                            Log::info('ProcessDocumentJob: Requirement created', [
                                'document_id' => $document->id,
                                'requirement_id' => $requirement->id,
                                'project_id' => $requirement->project_id
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::error('ProcessDocumentJob: Failed to create requirement', [
                            'document_id' => $document->id,
                            'index' => $index,
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString()
                        ]);
                        // Continue with next requirement
                    }
                }
            } else {
                Log::warning('ProcessDocumentJob: No requirements extracted', [
                    'document_id' => $document->id,
                    'result' => json_encode($result)
                ]);
            }

            // Update document status
            $document->update([
                'status' => $savedCount > 0 ? 'processed' : 'failed',
                'processed_at' => now(),
            ]);

            Log::info('ProcessDocumentJob: Processing complete', [
                'document_id' => $document->id,
                'status' => $savedCount > 0 ? 'processed' : 'failed',
                'saved_requirements' => $savedCount,
                'total_extracted' => count($result['requirements'] ?? [])
            ]);

            // If no requirements were saved, log detailed info
            if ($savedCount === 0) {
                Log::error('ProcessDocumentJob: No requirements saved!', [
                    'document_id' => $document->id,
                    'project_id' => $document->project_id,
                    'llm_result' => json_encode($result),
                    'content_preview' => mb_substr($content, 0, 500, 'UTF-8')
                ]);
            }

            // ===== Incremental KB update: add newly extracted requirements to the project's KB =====
            try {
                $newRequirements = Requirement::where('document_id', $document->id)
                    ->where('source', 'extracted')
                    ->get();

                $docsToAdd = [];
                foreach ($newRequirements as $r) {
                    $text = "Requirement: {$r->requirement_text}\nType: {$r->requirement_type}\nPriority: {$r->priority}";
                    $docsToAdd[] = [
                        'content' => $text,
                        'type' => 'requirement',
                        'meta' => [
                            'requirement_id' => $r->id,
                            'document_id' => $document->id,
                            'project_id' => $r->project_id,
                            'confidence_score' => $r->confidence_score,
                            'requirement_type' => $r->requirement_type,
                            'priority' => $r->priority,
                        ],
                    ];
                }

                if (!empty($docsToAdd)) {
                    try {
                        $res = $llmService->incrementalKBUpdate($document->project_id, $docsToAdd);

                        $skipped = $res['skipped_chunks'] ?? $res['skipped'] ?? 0;
                        $added = $res['added_chunks'] ?? count($docsToAdd);

                        Log::info('ProcessDocumentJob: Incrementally updated KB with new requirements', [
                            'document_id' => $document->id,
                            'project_id' => $document->project_id,
                            'added' => $added,
                            'skipped' => $skipped
                        ]);
                    } catch (\Exception $e) {
                        Log::warning('ProcessDocumentJob: incremental KB update failed', [
                            'document_id' => $document->id,
                            'project_id' => $document->project_id,
                            'error' => $e->getMessage()
                        ]);
                    }
                }
            } catch (\Exception $e) {
                Log::warning('ProcessDocumentJob: failed to prepare incremental KB documents', [
                    'document_id' => $document->id,
                    'error' => $e->getMessage()
                ]);
            }

            // ===== Trigger conflict detection for the project (re-run on full requirement set) =====
            try {
                $conflictService = app(\App\Services\ConflictDetectionService::class);
                $conflictResult = $conflictService->detectConflictsForProject($document->project_id);

                if (isset($conflictResult['job_id'])) {
                    // Dispatch the processor that polls the LLM job results
                    \App\Jobs\ProcessConflictDetectionJob::dispatch(
                        $conflictResult['job_id'],
                        $document->project_id
                    )->delay(now()->addSeconds(5));

                    Log::info('ProcessDocumentJob: Conflict detection initiated', [
                        'project_id' => $document->project_id,
                        'job_id' => $conflictResult['job_id'] ?? null
                    ]);
                }
            } catch (\Exception $e) {
                Log::warning('ProcessDocumentJob: Failed to trigger conflict detection', [
                    'project_id' => $document->project_id,
                    'error' => $e->getMessage()
                ]);
            }

        } catch (Throwable $e) {
            $document->update(['status' => 'failed']);
            
            Log::error('ProcessDocumentJob failed', [
                'document_id' => $document->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            throw $e;
        }
    }

    public function failed(Throwable $exception): void
    {
        try {
            $document = Document::find($this->documentId);
            if ($document && $document->status !== 'processed') {
                $document->update(['status' => 'failed']);
            }
        } catch (Throwable $e) {
            // Swallow any errors here
        }

        Log::error('ProcessDocumentJob permanently failed', [
            'document_id' => $this->documentId,
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString()
        ]);
    }
}