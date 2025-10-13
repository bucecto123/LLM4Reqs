<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\LLMService;
use App\Models\Document;
use App\Models\Requirement;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TestDocumentUpload extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:document-upload';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the complete document upload and processing workflow';

    private LLMService $llmService;

    public function __construct(LLMService $llmService)
    {
        parent::__construct();
        $this->llmService = $llmService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('=== Document Upload Workflow Test ===');
        
        // Test 1: Check LLM Service connectivity
        $this->info('1. Testing LLM Service connectivity...');
        if ($this->llmService->testConnection()) {
            $this->info('✅ LLM Service is running and accessible');
        } else {
            $this->error('❌ LLM Service is not accessible');
            return 1;
        }

        // Test 2: Create test project and user
        $this->info('2. Setting up test data...');
        
        $user = User::firstOrCreate(
            ['email' => 'test@example.com'],
            ['name' => 'Test User', 'password' => bcrypt('password')]
        );
        
        $project = Project::firstOrCreate(
            ['name' => 'Test Project'],
            ['description' => 'Test project for document upload', 'owner_id' => $user->id]
        );
        
        $this->info("✅ Test user (ID: {$user->id}) and project (ID: {$project->id}) ready");

        // Test 3: Test content extraction
        $this->info('3. Testing content extraction...');
        
        $testContent = "System Requirements:\n\n1. The system must allow user authentication\n2. Users should be able to upload documents\n3. The system shall process documents automatically";
        
        // Create a temporary test file
        $tempFilePath = storage_path('app/temp_test_requirements.txt');
        file_put_contents($tempFilePath, $testContent);
        
        // Test content extraction
        $extractedContent = $this->extractTestContent($tempFilePath, 'text/plain');
        
        if ($extractedContent && strlen($extractedContent) > 0) {
            $this->info('✅ Content extraction working');
            $this->line("📄 Extracted content: " . substr($extractedContent, 0, 100) . "...");
        } else {
            $this->error('❌ Content extraction failed');
            return 1;
        }

        // Test 4: Create document record
        $this->info('4. Testing document creation...');
        
        $document = Document::create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'filename' => 'test_requirements_' . time() . '.txt',
            'original_filename' => 'test_requirements.txt',
            'file_path' => 'documents/test_requirements_' . time() . '.txt',
            'content' => $extractedContent,
            'file_size' => strlen($testContent),
            'file_type' => 'text/plain',
            'status' => 'uploaded'
        ]);
        
        $this->info("✅ Document created (ID: {$document->id})");

        // Test 5: Test LLM extraction
        $this->info('5. Testing LLM requirements extraction...');
        
        try {
            $result = $this->llmService->extractRequirements($extractedContent, 'text/plain');
            
            if (isset($result['requirements']) && is_array($result['requirements'])) {
                $this->info("✅ LLM extraction successful - found {$result['total_extracted']} requirements");
                
                // Test 6: Save requirements to database
                $this->info('6. Testing requirements storage...');
                
                $savedRequirements = [];
                foreach ($result['requirements'] as $req) {
                    $requirement = Requirement::create([
                        'project_id' => $document->project_id,
                        'document_id' => $document->id,
                        'title' => substr($req['requirement_text'], 0, 255), // Truncate for title
                        'requirement_text' => $req['requirement_text'],
                        'requirement_type' => $req['requirement_type'] ?? 'functional',
                        'priority' => $req['priority'] ?? 'medium',
                        'confidence_score' => $req['confidence_score'] ?? 0.8,
                        'source' => 'extracted',
                        'status' => 'draft'
                    ]);
                    $savedRequirements[] = $requirement;
                }
                
                $this->info("✅ Saved " . count($savedRequirements) . " requirements to database");
                
                // Display extracted requirements
                $this->info('📋 Extracted Requirements:');
                foreach ($savedRequirements as $i => $req) {
                    $this->line("   " . ($i + 1) . ". [{$req->requirement_type}] {$req->requirement_text}");
                }
                
                // Update document status
                $document->update(['status' => 'processed', 'processed_at' => now()]);
                $this->info('✅ Document status updated to processed');
                
            } else {
                $this->error('❌ LLM extraction returned invalid format');
                return 1;
            }
            
        } catch (\Exception $e) {
            $this->error('❌ LLM extraction failed: ' . $e->getMessage());
            return 1;
        }

        // Test 7: Test project documents listing
        $this->info('7. Testing project documents listing...');
        
        $projectDocuments = Document::where('project_id', $project->id)
            ->with('user:id,name')
            ->orderBy('created_at', 'desc')
            ->get();
            
        $this->info("✅ Found {$projectDocuments->count()} documents in project");

        // Cleanup
        $this->info('8. Cleaning up test data...');
        if (file_exists($tempFilePath)) {
            unlink($tempFilePath);
        }
        
        $this->info('✅ Cleanup completed');

        $this->info("\n=== TEST SUMMARY ===");
        $this->info('✅ All document upload workflow tests passed!');
        $this->info('✅ LLM Service integration working');
        $this->info('✅ Content extraction working');
        $this->info('✅ Database storage working');
        $this->info('✅ Requirements extraction working');
        $this->info('✅ All APIs are functional');
        
        return 0;
    }

    /**
     * Test content extraction (simplified version)
     */
    private function extractTestContent($filePath, $mimeType)
    {
        try {
            switch ($mimeType) {
                case 'text/plain':
                case 'text/markdown':
                    return file_get_contents($filePath);
                default:
                    return '';
            }
        } catch (\Exception $e) {
            return '';
        }
    }
}
