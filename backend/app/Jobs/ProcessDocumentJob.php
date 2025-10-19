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

    /**
     * The document ID to process.
     */
    public int $documentId;

    /**
     * Number of attempts for the job.
     */
    public int $tries = 3;

    /**
     * Backoff between retries in seconds.
     * @var array<int>
     */
    public array $backoff = [10, 30, 90];

    /**
     * Timeout for the job execution in seconds.
     */
    public int $timeout = 180;

    /**
     * Create a new job instance.
     */
    public function __construct(int $documentId)
    {
        $this->documentId = $documentId;
    }

    /**
     * Unique job identifier to prevent concurrent processing of the same document.
     */
    public function uniqueId(): string
    {
        return 'process_document_' . $this->documentId;
    }

    /**
     * Execute the job.
     */
    public function handle(LLMService $llmService, TextCommons $textCommons): void
    {
        $document = Document::find($this->documentId);

        if (!$document) {
            Log::warning('ProcessDocumentJob: Document not found', ['document_id' => $this->documentId]);
            return; // Nothing to do
        }

        // Idempotency: if already processed and has extracted requirements, skip
        $existingCount = Requirement::where('document_id', $document->id)
            ->where('source', 'extracted')
            ->count();
        if ($document->status === 'processed' && $existingCount > 0) {
            Log::info('ProcessDocumentJob: Document already processed, skipping', ['document_id' => $document->id]);
            return;
        }

        if (empty($document->content)) {
            // Mark as failed due to empty content
            $document->update(['status' => 'failed']);
            Log::warning('ProcessDocumentJob: Document has no content', ['document_id' => $document->id]);
            return;
        }

        try {
            // Pre-mark as processing
            $document->update(['status' => 'processing']);

            // Clean and truncate content to keep request size reasonable
            $content = $textCommons->cleanUtf8Content((string)($document->content ?? ''));
            if (mb_strlen($content, 'UTF-8') > 8000) {
                $content = mb_substr($content, 0, 8000, 'UTF-8') . "\n... [Document truncated for processing]";
            }

            // Call LLM service
            $result = $llmService->extractRequirements(
                $content,
                (string)($document->file_type ?? 'text/plain')
            );

            // If we want fresh extraction on re-run, clear previous extracted requirements
            if ($existingCount > 0) {
                Requirement::where('document_id', $document->id)
                    ->where('source', 'extracted')
                    ->delete();
            }

            // Persist requirements
            $savedCount = 0;
            if (!empty($result['requirements']) && is_array($result['requirements'])) {
                foreach ($result['requirements'] as $req) {
                    // Be defensive about missing fields from LLM
                    $requirement = Requirement::create([
                        'project_id' => $document->project_id,
                        'document_id' => $document->id,
                        'title' => $req['title'] ?? null,
                        'requirement_text' => $req['requirement_text'] ?? ($req['text'] ?? ''),
                        'requirement_type' => $req['requirement_type'] ?? 'functional',
                        'priority' => $req['priority'] ?? 'medium',
                        'confidence_score' => $req['confidence_score'] ?? null,
                        'source' => 'extracted',
                        'status' => $req['status'] ?? 'draft',
                    ]);
                    if ($requirement) {
                        $savedCount++;
                    }
                }
            }

            // Update document status
            $document->update([
                'status' => 'processed',
                'processed_at' => now(),
            ]);

            Log::info('ProcessDocumentJob: Document processed', [
                'document_id' => $document->id,
                'saved_requirements' => $savedCount,
                'total_extracted' => $result['total_extracted'] ?? $savedCount,
            ]);
        } catch (Throwable $e) {
            // Mark as failed and rethrow to allow retry based on tries/backoff
            $document->update(['status' => 'failed']);
            Log::error('ProcessDocumentJob failed', [
                'document_id' => $document->id ?? $this->documentId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Called when the job has failed permanently.
     */
    public function failed(Throwable $exception): void
    {
        try {
            $document = Document::find($this->documentId);
            if ($document && $document->status !== 'processed') {
                $document->update(['status' => 'failed']);
            }
        } catch (Throwable $e) {
            // Swallow any errors here to avoid cascading failures
        }

        Log::error('ProcessDocumentJob permanently failed', [
            'document_id' => $this->documentId,
            'error' => $exception->getMessage(),
        ]);
    }
}
