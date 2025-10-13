<?php

namespace App\Http\Controllers;

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
                'content' => $content,
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
            switch ($mimeType) {
                case 'text/plain':
                case 'text/markdown':
                    return file_get_contents($tempPath);
                
                case 'application/pdf':
                    return $this->extractPdfContent($tempPath);
                
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                case 'application/msword':
                    return $this->extractDocxContent($tempPath);
                
                default:
                    return '';
            }
        } catch (\Exception $e) {
            // If extraction fails, return empty content
            return '';
        }
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
            // Extract requirements using LLM
            $result = $this->llmService->extractRequirements(
                $document->content,
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
            return response()->json([
                'success' => false,
                'message' => 'Failed to process document: ' . $e->getMessage()
            ], 500);
        } 
    }
}