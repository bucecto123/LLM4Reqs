<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LLMService;
use App\Models\Document;
use App\Models\Requirement;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class DocumentController extends Controller
{
    private LLMService $llmService;

    public function __construct(LLMService $llmService)
    {
        $this->llmService = $llmService;
    }

    /**
     * Upload and process a document
     */
    public function upload(Request $request)
    {
        // Validate the request
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:10240|mimes:pdf,doc,docx,txt,md', // 10MB max
            'project_id' => 'required|exists:projects,id',
            'conversation_id' => 'nullable|exists:conversations,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $file = $request->file('file');
            $projectId = $request->input('project_id');
            $conversationId = $request->input('conversation_id');
            
            // Generate unique filename
            $originalName = $file->getClientOriginalName();
            $filename = Str::random(40) . '.' . $file->getClientOriginalExtension();
            
            // Store file in storage/app/documents
            $filePath = $file->storeAs('documents', $filename);
            
            // Extract content from file based on type
            $content = $this->extractContentFromFile($file);
            
            // Create document record
            $document = Document::create([
                'project_id' => $projectId,
                'conversation_id' => $conversationId,
                'user_id' => auth()->id(),
                'filename' => $filename,
                'original_filename' => $originalName,
                'file_path' => $filePath,
                'content' => $content, // Content is already cleaned by extractContentFromFile
                'file_size' => $file->getSize(),
                'file_type' => $file->getClientMimeType(),
                'status' => 'uploaded'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Document uploaded successfully',
                'document' => $document
            ], 201);

        } catch (\Exception $e) {
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

        try {
            $content = '';
            switch ($mimeType) {
                case 'text/plain':
                case 'text/markdown':
                    $content = file_get_contents($tempPath);
                    break;
                
                case 'application/pdf':
                    $content = $this->extractPdfContent($tempPath);
                    break;
                
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                case 'application/msword':
                    $content = $this->extractDocxContent($tempPath);
                    break;
                
                default:
                    return '';
            }
            
            // Clean and validate UTF-8 encoding
            return $this->cleanUtf8Content($content);
        } catch (\Exception $e) {
            // If extraction fails, return empty content
            return '';
        }
    }

    /**
     * Clean and validate UTF-8 content
     */
    private function cleanUtf8Content($content)
    {
        if (empty($content)) {
            return '';
        }
        
        // Convert to UTF-8 if not already
        if (!mb_check_encoding($content, 'UTF-8')) {
            // Try to detect encoding and convert
            $encoding = mb_detect_encoding($content, ['UTF-8', 'ISO-8859-1', 'Windows-1252', 'ASCII'], true);
            if ($encoding) {
                $content = mb_convert_encoding($content, 'UTF-8', $encoding);
            } else {
                // If detection fails, use utf8_encode as fallback
                $content = utf8_encode($content);
            }
        }
        
        // Remove or replace problematic characters
        $content = mb_convert_encoding($content, 'UTF-8', 'UTF-8'); // This removes invalid sequences
        
        // Remove control characters except newlines, tabs, and carriage returns
        $content = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $content);
        
        // Replace multiple whitespace with single space, but preserve line breaks
        $content = preg_replace('/[ \t]+/', ' ', $content);
        $content = preg_replace('/\n{3,}/', "\n\n", $content);
        
        return trim($content);
    }

    /**
     * Extract content from PDF file
     */
    private function extractPdfContent($filePath)
    {
        try {
            // First try using smalot/pdfparser if available
            if (class_exists('Smalot\PdfParser\Parser')) {
                $parser = new \Smalot\PdfParser\Parser();
                $pdf = $parser->parseFile($filePath);
                $text = $pdf->getText();
                
                // Clean up the extracted text
                $text = trim($text);
                $text = preg_replace('/\s+/', ' ', $text); // Replace multiple spaces with single space
                
                return $text ?: "No readable text found in PDF file.";
            }
            
            // Fallback: Return a placeholder message indicating manual processing needed
            return "PDF file uploaded. Text extraction requires manual processing or additional PDF parsing library. File: " . basename($filePath);
        } catch (\Exception $e) {
            return "Error processing PDF file: " . $e->getMessage() . ". Manual processing may be required.";
        }
    }

    /**
     * Extract content from DOCX file
     */
    private function extractDocxContent($filePath)
    {
        try {
            // Basic DOCX content extraction using ZIP and XML parsing
            $zip = new \ZipArchive();
            if ($zip->open($filePath) === TRUE) {
                $xml = $zip->getFromName('word/document.xml');
                $zip->close();
                
                if ($xml !== false) {
                    // Parse XML to extract text
                    $dom = new \DOMDocument();
                    libxml_use_internal_errors(true);
                    $dom->loadXML($xml);
                    libxml_clear_errors();
                    
                    // Extract text content from w:t elements
                    $xpath = new \DOMXPath($dom);
                    $textNodes = $xpath->query('//w:t');
                    
                    $content = '';
                    foreach ($textNodes as $textNode) {
                        $content .= $textNode->textContent . ' ';
                    }
                    
                    return trim($content) ?: "No readable text found in DOCX file.";
                }
            }
            
            return "Unable to extract text from DOCX file.";
        } catch (\Exception $e) {
            return "Error extracting DOCX content: " . $e->getMessage();
        }
    }

    /**
     * Get all documents for a project
     */
    public function getProjectDocuments(Request $request, $projectId)
    {
        // Validate project exists
        $project = Project::findOrFail($projectId);
        
        try {
            $documents = Document::where('project_id', $projectId)
                ->with('user:id,name')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'documents' => $documents
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve documents: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process document and extract requirements
     */
    public function processDocument(Request $request, $documentId)
    {
        $document = Document::findOrFail($documentId);
        
        // Check if document has content
        if (empty($document->content)) {
            return response()->json([
                'success' => false,
                'message' => 'Document has no text content'
            ], 400);
        }
        
        try {
            // Clean and truncate document content if it's too large for LLM processing
            $content = $this->cleanUtf8Content($document->content ?? '');
            if (strlen($content) > 8000) { // Rough limit to stay within token constraints
                $content = mb_substr($content, 0, 8000, 'UTF-8') . "\n... [Document truncated for processing]";
            }
            
            // Extract requirements using LLM
            $result = $this->llmService->extractRequirements(
                $content,
                $document->file_type
            );
            
            // Save requirements to database
            $savedRequirements = [];
            foreach ($result['requirements'] as $req) {
                $requirement = Requirement::create([
                    'project_id' => $document->project_id,
                    'document_id' => $document->id,
                    'requirement_text' => $req['requirement_text'],
                    'requirement_type' => $req['requirement_type'],
                    'priority' => $req['priority'],
                    'confidence_score' => $req['confidence_score'],
                    'source' => 'extracted',
                    'status' => 'draft'
                ]);
                $savedRequirements[] = $requirement;
            }
            
            // Update document status
            $document->update([
                'status' => 'processed',
                'processed_at' => now()
            ]);
            
            return response()->json([
                'success' => true,
                'total_extracted' => $result['total_extracted'],
                'requirements' => $savedRequirements
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Document processing failed: ' . $e->getMessage());
            
            $errorMessage = 'Failed to process document';
            
            // Handle specific error types
            if (strpos($e->getMessage(), 'Malformed UTF-8') !== false || 
                strpos($e->getMessage(), 'json_encode') !== false) {
                $errorMessage = 'Document contains invalid characters. Please check file encoding.';
            } elseif (strpos($e->getMessage(), 'Request too large') !== false ||
                     strpos($e->getMessage(), 'rate_limit_exceeded') !== false) {
                $errorMessage = 'Document is too large for processing. Please use smaller files.';
            }
            
            return response()->json([
                'success' => false,
                'message' => $errorMessage . ': ' . $e->getMessage()
            ], 500);
        } 
    }
}