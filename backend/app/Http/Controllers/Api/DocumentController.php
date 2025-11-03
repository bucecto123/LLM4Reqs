<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessDocumentJob;
use App\Services\LLMService;
use App\Models\Document;
use App\Models\Requirement;
use App\Models\Project;
use App\Utils\TextCommons;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class DocumentController extends Controller
{
    private LLMService $llmService;
    private TextCommons $textCommons;

    public function __construct(LLMService $llmService, TextCommons $textCommons)
    {
        $this->llmService = $llmService;
        $this->textCommons = $textCommons;
    }

    /**
     * Upload and process a document
     */
    public function upload(Request $request)
    {
        Log::info('Document upload request received', [
            'has_file' => $request->hasFile('file'),
            'project_id' => $request->input('project_id'),
            'conversation_id' => $request->input('conversation_id')
        ]);

        // Validate the request
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:10240|mimes:pdf,doc,docx,txt,md',
            'project_id' => 'required|exists:projects,id',
            'conversation_id' => 'nullable|exists:conversations,id'
        ]);

        if ($validator->fails()) {
            Log::error('Document upload validation failed', [
                'errors' => $validator->errors()->toArray()
            ]);
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $file = $request->file('file');
            $projectId = $request->input('project_id');
            $conversationId = $request->input('conversation_id');
            
            $originalName = $file->getClientOriginalName();
            $filename = Str::random(40) . '.' . $file->getClientOriginalExtension();
            
            Log::info('Processing file upload', [
                'original_name' => $originalName,
                'generated_filename' => $filename,
                'size' => $file->getSize(),
                'mime_type' => $file->getClientMimeType()
            ]);
            
            // Store file
            $filePath = $file->storeAs('documents', $filename);
            
            Log::info('File stored', ['path' => $filePath]);
            
            // Extract content
            $content = $this->extractContentFromFile($file);
            
            Log::info('Content extracted', [
                'content_length' => mb_strlen($content, 'UTF-8'),
                'content_preview' => mb_substr($content, 0, 200, 'UTF-8') . '...'
            ]);
            
            // Validate project
            $project = Project::findOrFail($projectId);
            
            // Create document record
            $document = Document::create([
                'project_id' => $projectId,
                'conversation_id' => $conversationId,
                'user_id' => auth()->id(),
                'filename' => $filename,
                'original_filename' => $originalName,
                'file_path' => $filePath,
                'content' => $content,
                'file_size' => $file->getSize(),
                'file_type' => $file->getClientMimeType(),
                'status' => 'pending'
            ]);

            Log::info('Document record created', [
                'document_id' => $document->id,
                'project_id' => $document->project_id
            ]);

            // Dispatch processing job
            ProcessDocumentJob::dispatch($document->id);
            
            Log::info('ProcessDocumentJob dispatched', [
                'document_id' => $document->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Document uploaded successfully and queued for processing',
                'document' => $document->load('project')
            ], 201);

        } catch (\Exception $e) {
            Log::error('Document upload failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload document: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Extract content from uploaded file
     */
    private function extractContentFromFile($file)
    {
        $mimeType = $file->getClientMimeType();
        $tempPath = $file->getPathname();

        Log::info('Extracting content from file', [
            'mime_type' => $mimeType,
            'original_name' => $file->getClientOriginalName()
        ]);

        try {
            $content = '';
            switch ($mimeType) {
                case 'text/plain':
                case 'text/markdown':
                    $content = file_get_contents($tempPath);
                    Log::info('Extracted text/markdown content', [
                        'length' => strlen($content)
                    ]);
                    break;
                
                case 'application/pdf':
                    $content = $this->extractPdfContent($tempPath);
                    Log::info('Extracted PDF content', [
                        'length' => strlen($content)
                    ]);
                    break;
                
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                case 'application/msword':
                    $content = $this->extractDocxContent($tempPath);
                    Log::info('Extracted DOCX content', [
                        'length' => strlen($content)
                    ]);
                    break;
                
                default:
                    Log::warning('Unsupported file type', ['mime_type' => $mimeType]);
                    return 'Unsupported file type for content extraction: ' . $mimeType;
            }
            
            // Clean and validate UTF-8 encoding
            $cleaned = $this->textCommons->cleanUtf8Content($content);
            
            Log::info('Content cleaned', [
                'original_length' => strlen($content),
                'cleaned_length' => strlen($cleaned)
            ]);
            
            return $cleaned;
            
        } catch (\Exception $e) {
            Log::error('Content extraction failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return 'Error extracting content: ' . $e->getMessage();
        }
    }

    /**
     * Extract content from PDF file
     */
    private function extractPdfContent($filePath)
    {
        try {
            if (class_exists('Smalot\PdfParser\Parser')) {
                // Try parsing with lenient configuration first
                try {
                    // Check if Config class exists (it may not in older versions)
                    if (class_exists('Smalot\PdfParser\Config')) {
                        $config = new \Smalot\PdfParser\Config();
                        $config->setRetainImageContent(false); // Don't extract images
                        $parser = new \Smalot\PdfParser\Parser([], $config);
                    } else {
                        $parser = new \Smalot\PdfParser\Parser();
                    }
                    
                    $pdf = $parser->parseFile($filePath);
                    $text = $pdf->getText();
                } catch (\Exception $parseError) {
                    Log::warning('PDF parsing error, attempting fallback', [
                        'error' => $parseError->getMessage()
                    ]);
                    
                    // Try with default config as fallback
                    $parser = new \Smalot\PdfParser\Parser();
                    $pdf = $parser->parseFile($filePath);
                    $text = $pdf->getText();
                }
                
                // Clean up the text
                $text = trim($text);
                
                // Normalize whitespace but preserve paragraph breaks
                $text = preg_replace('/[ \t]+/', ' ', $text);
                $text = preg_replace('/\n{3,}/', "\n\n", $text);
                
                // Check if we got meaningful content
                $text = trim($text);
                if (empty($text)) {
                    Log::warning('PDF parsed but no text extracted', [
                        'file_path' => $filePath
                    ]);
                    return "PDF processed but no readable text found. The PDF may contain only images or scanned content.";
                }
                
                // Log extraction success
                Log::info('PDF text extracted successfully', [
                    'text_length' => strlen($text),
                    'has_content' => !empty($text)
                ]);
                
                return $text;
            }
            
            return "PDF file uploaded. Text extraction requires pdfparser library. Please install: composer require smalot/pdfparser";
        } catch (\Exception $e) {
            Log::error('PDF extraction failed', [
                'error' => $e->getMessage(),
                'file_path' => $filePath,
                'trace' => $e->getTraceAsString()
            ]);
            
            // Return a more informative error message
            $errorMsg = $e->getMessage();
            if (str_contains($errorMsg, 'Unable to find object')) {
                return "Error processing PDF: The PDF file may be corrupted or use an unsupported format. Try re-saving the PDF or converting it to a standard PDF format.";
            } elseif (str_contains($errorMsg, 'Encoding')) {
                return "Error processing PDF: The PDF uses an encoding that is not currently supported. Text content may not be extractable from this file.";
            }
            
            return "Error processing PDF: " . $errorMsg;
        }
    }

    /**
     * Extract content from DOCX file
     */
    private function extractDocxContent($filePath)
    {
        try {
            $zip = new \ZipArchive();
            if ($zip->open($filePath) === TRUE) {
                $xml = $zip->getFromName('word/document.xml');
                $zip->close();
                
                if ($xml !== false) {
                    $dom = new \DOMDocument();
                    libxml_use_internal_errors(true);
                    $dom->loadXML($xml);
                    libxml_clear_errors();
                    
                    $xpath = new \DOMXPath($dom);
                    $textNodes = $xpath->query('//w:t');
                    
                    $content = '';
                    foreach ($textNodes as $textNode) {
                        $content .= $textNode->textContent . ' ';
                    }
                    
                    return trim($content) ?: "DOCX processed but no readable text found.";
                }
            }
            
            return "Unable to extract text from DOCX file.";
        } catch (\Exception $e) {
            Log::error('DOCX extraction failed', [
                'error' => $e->getMessage()
            ]);
            return "Error extracting DOCX content: " . $e->getMessage();
        }
    }

    /**
     * Get all documents for a project
     */
    public function getProjectDocuments(Request $request, $projectId)
    {
        $project = Project::findOrFail($projectId);
        
        try {
            $documents = Document::where('project_id', $projectId)
                ->with(['user:id,name'])
                ->orderBy('created_at', 'desc')
                ->get();

            // Add requirement counts for each document
            $documents->each(function ($doc) {
                $doc->requirements_count = Requirement::where('document_id', $doc->id)->count();
            });

            Log::info('Retrieved project documents', [
                'project_id' => $projectId,
                'count' => $documents->count()
            ]);

            return response()->json([
                'success' => true,
                'documents' => $documents
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to retrieve documents', [
                'project_id' => $projectId,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve documents: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Trigger document processing manually
     */
    public function processDocument(Request $request, $documentId)
    {
        $document = Document::findOrFail($documentId);

        Log::info('Manual document processing triggered', [
            'document_id' => $documentId,
            'current_status' => $document->status,
            'has_content' => !empty($document->content)
        ]);

        if (empty($document->content)) {
            return response()->json([
                'success' => false,
                'message' => 'Document has no text content to process'
            ], 400);
        }

        // Dispatch job
        $job = new ProcessDocumentJob($document->id);
        $jobId = $job->uniqueId();
        dispatch($job);

        Log::info('Document processing job dispatched', [
            'document_id' => $document->id,
            'job_id' => $jobId
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Document processing queued',
            'job_id' => $jobId,
            'document_id' => $document->id,
        ], 202);
    }
}