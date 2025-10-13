# 🚀 AI Requirements Generation Service - Groq Edition

## 📋 Tổng Quan

FastAPI service sử dụng **Groq** (FREE & SUPER FAST!) để:
- ✅ Trích xuất requirements từ văn bản
- ✅ Chat với AI về requirements  
- ✅ Tạo persona-specific views
- ✅ Phát hiện conflicts giữa các requirements

**Tại sao dùng Groq?**
- 🆓 **Hoàn toàn FREE** - không lo API costs
- ⚡ **Cực kỳ NHANH** - nhanh hơn OpenAI 10-20 lần
- 🎯 **Perfect cho project capstone** - không giới hạn, không tốn tiền

---

## 🚀 Setup & Installation

### 1. Get Groq API Key (FREE!)

1. Đi tới https://console.groq.com/
2. Sign up (dùng email hoặc Google)
3. Vào "API Keys" → Create API Key
4. Copy API key (bắt đầu bằng `gsk_...`)

### 2. Cài đặt Dependencies

```bash
cd llm
pip install -r requirements.txt
```

### 3. Cấu hình Environment

Tạo file `.env`:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=mixtral-8x7b-32768
```

**Groq Models Available (tất cả FREE!):**
- `mixtral-8x7b-32768` - **RECOMMENDED** - Best cho complex tasks, 32k context
- `llama-3.1-8b-instant` - Nhanh nhất, tốt cho simple tasks
- `llama-3.1-70b-versatile` - Powerful nhất, chậm hơn
- `gemma2-9b-it` - Cân bằng tốt

### 4. Chạy Service

```bash
uvicorn main:app --reload
```

Service chạy tại: `http://localhost:8000`

Docs tự động: `http://localhost:8000/docs` (Swagger UI)

### 5. Test Service

```bash
# Health check
curl http://localhost:8000/health

# Test Groq connection
curl -X POST http://localhost:8000/api/test
```

---

## 📚 API Endpoints

### 1. `/api/extract` - Trích xuất Requirements

**Request:**
```bash
curl -X POST http://localhost:8000/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The application should allow users to log in using email and password. The system must be secure and fast, responding within 2 seconds.",
    "document_type": "meeting_notes"
  }'
```

**Response:**
```json
{
  "requirements": [
    {
      "requirement_text": "The system must support user authentication via email and password",
      "requirement_type": "functional",
      "priority": "high",
      "confidence_score": 0.95
    },
    {
      "requirement_text": "The system must respond to authentication requests within 2 seconds",
      "requirement_type": "non-functional",
      "priority": "high",
      "confidence_score": 0.9
    }
  ],
  "total_extracted": 2,
  "tokens_used": 245
}
```

---

### 2. `/api/chat` - Chat với AI

**Request:**
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is a functional requirement?",
    "conversation_history": [],
    "context": "Project: E-commerce platform"
  }'
```

**Response:**
```json
{
  "response": "A functional requirement describes what the system should do - specific behaviors, features, or functions...",
  "tokens_used": 150,
  "model": "mixtral-8x7b-32768"
}
```

---

### 3. `/api/persona/generate` - Tạo Persona View

**Request:**
```bash
curl -X POST http://localhost:8000/api/persona/generate \
  -H "Content-Type: application/json" \
  -d '{
    "requirement_text": "The system must process 1000 transactions per second",
    "persona_name": "Developer",
    "persona_prompt": "Focus on technical implementation and architecture"
  }'
```

**Response:**
```json
{
  "persona_view": "**Technical Implementation Requirements:**\n- Need horizontal scaling architecture with load balancers...",
  "tokens_used": 320
}
```

---

### 4. `/api/conflicts/detect` - Phát hiện Conflicts

**Request:**
```bash
curl -X POST http://localhost:8000/api/conflicts/detect \
  -H "Content-Type: application/json" \
  -d '{
    "requirements": [
      {"id": 1, "text": "The system must work completely offline"},
      {"id": 2, "text": "The system requires real-time cloud synchronization"}
    ]
  }'
```

**Response:**
```json
{
  "conflicts": [
    {
      "requirement_id_1": 1,
      "requirement_id_2": 2,
      "conflict_description": "Offline capability conflicts with real-time cloud sync requirement",
      "severity": "high"
    }
  ],
  "total_conflicts": 1
}
```

---

## 🔧 Laravel Integration

### 1. Tạo LLMService

```bash
php artisan make:service LLMService
```

### 2. Code - `app/Services/LLMService.php`

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LLMService
{
    private string $baseUrl;

    public function __construct()
    {
  $this->baseUrl = config('services.llm.url', 'http://localhost:8000');
    }

    /**
     * Extract requirements from text
     */
    public function extractRequirements(string $text, string $documentType = 'meeting_notes'): array
    {
        try {
            $response = Http::timeout(90)->post("{$this->baseUrl}/api/extract", [
                'text' => $text,
                'document_type' => $documentType,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('LLM API failed: ' . $response->body());
        } catch (\Exception $e) {
            Log::error('LLM extraction failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Chat with AI
     */
    public function chat(string $message, array $history = [], ?string $context = null): array
    {
        try {
            $response = Http::timeout(60)->post("{$this->baseUrl}/api/chat", [
                'message' => $message,
                'conversation_history' => $history,
                'context' => $context,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('LLM chat failed: ' . $response->body());
        } catch (\Exception $e) {
            Log::error('LLM chat failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Generate persona-specific view
     */
    public function generatePersonaView(string $requirementText, string $personaName, string $personaPrompt): array
    {
        try {
            $response = Http::timeout(60)->post("{$this->baseUrl}/api/persona/generate", [
                'requirement_text' => $requirementText,
                'persona_name' => $personaName,
                'persona_prompt' => $personaPrompt,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('Persona generation failed');
        } catch (\Exception $e) {
            Log::error('Persona generation failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Test connection to LLM service
     */
    public function testConnection(): bool
    {
        try {
            $response = Http::timeout(10)->get("{$this->baseUrl}/health");
            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }
}
```

### 3. Config - `config/services.php`

```php
'llm' => [
  'url' => env('LLM_SERVICE_URL', 'http://localhost:8000'),
],
```

### 4. Environment - `.env`

```env
LLM_SERVICE_URL=http://localhost:8000
```

---

## 💻 Example Controller Usage

```php
<?php

namespace App\Http\Controllers;

use App\Services\LLMService;
use App\Models\Document;
use App\Models\Requirement;
use Illuminate\Http\Request;

class DocumentController extends Controller
{
    private LLMService $llmService;

    public function __construct(LLMService $llmService)
    {
        $this->llmService = $llmService;
    }

    /**
     * Process document and extract requirements
     */
    public function processDocument(Request $request, $documentId)
    {
        $document = Document::findOrFail($documentId);
        
        // Check if document has text
        if (empty($document->extracted_text)) {
            return response()->json([
                'error' => 'Document has no text content'
            ], 400);
        }
        
        try {
            // Extract requirements using LLM
            $result = $this->llmService->extractRequirements(
                $document->extracted_text,
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
                'error' => 'Failed to process document',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
```

---

## 🧪 Testing

### Test với Postman

1. Import collection từ `http://localhost:8000/docs`
2. Hoặc test manually:

**Extract Requirements:**
```
POST http://localhost:8000/api/extract
Content-Type: application/json

{
  "text": "Users should upload images. Support JPG and PNG. Max 10MB.",
  "document_type": "meeting_notes"
}
```

**Chat:**
```
POST http://localhost:8000/api/chat
Content-Type: application/json

{
  "message": "What are non-functional requirements?",
  "conversation_history": [],
  "context": null
}
```

---

## ⚡ Performance & Costs

### Groq Speed (SO FAST!)
- Extract requirements: **~2-4 seconds** (vs OpenAI 10-15s)
- Chat response: **~1-2 seconds** (vs OpenAI 5-8s)
- Persona generation: **~3-5 seconds** (vs OpenAI 8-12s)

### Costs
- **$0.00** - COMPLETELY FREE! 🎉
- No rate limits for reasonable usage
- Perfect for capstone projects

---

## 🐛 Troubleshooting

### 1. Service không start

```bash
# Check Python version
python --version  # Need 3.8+

# Reinstall groq
pip install groq --upgrade

# Check logs
python main.py
```

### 2. "Groq API error"

**Check API key:**
```bash
# Verify .env has correct key
cat .env | grep GROQ_API_KEY

# Test directly
curl -X POST http://localhost:8000/api/test
```

**Get new API key:**
- Vào https://console.groq.com/keys
- Create new key
- Update `.env`

### 3. Laravel không connect được

```bash
# Test service health
curl http://localhost:8000/health

# Test from Laravel
php artisan tinker
>>> $service = new App\Services\LLMService();
>>> $service->testConnection();
```

### 4. JSON parsing errors

- Groq đôi khi trả về markdown, code đã handle
- Nếu vẫn lỗi, thử model khác:
  ```env
  GROQ_MODEL=llama-3.1-70b-versatile
  ```

---

## 🎯 Tips & Best Practices

### 1. Chọn Model phù hợp

**Cho Requirement Extraction:**
```env
GROQ_MODEL=mixtral-8x7b-32768  # Best balance
```

**Cho Chat (nhanh):**
```env
GROQ_MODEL=llama-3.1-8b-instant  # Super fast
```

**Cho Conflict Detection (accurate):**
```env
GROQ_MODEL=llama-3.1-70b-versatile  # Most accurate
```

### 2. Optimize Prompts

- Luôn yêu cầu "valid JSON"
- Đặt temperature thấp (0.3) cho structured output
- Temperature cao (0.7-0.9) cho creative output

### 3. Handle Errors Gracefully

```php
try {
    $result = $llmService->extractRequirements($text);
} catch (\Exception $e) {
    // Fallback: manual entry or retry
    Log::error('LLM failed', ['error' => $e->getMessage()]);
    return response()->json(['error' => 'AI temporarily unavailable']);
}
```

---

## 📊 Example Full Flow

```bash
# 1. Start FastAPI service
cd llm
python main.py

# 2. Start Laravel
cd ../laravel-backend
php artisan serve

# 3. Test integration
curl -X POST http://localhost:8000/api/documents/1/process

# 4. Check results
curl http://localhost:8000/api/projects/1/requirements
```

[Dataset: Software Requirements Dataset by SOUVIK](https://www.kaggle.com/datasets/iamsouvik/software-requirements-dataset)

---

## 🔁 RAG (Retrieval-Augmented Generation) - Quickstart

This repo includes a small RAG workflow using sentence-transformers + FAISS to index the provided `enriched_requirements.csv` and enable retrieval for LLM prompts.

### Install extra dependencies

```powershell
cd llm
pip install sentence-transformers faiss-cpu
```

If `faiss-cpu` is unavailable on your platform, install the appropriate faiss package or use conda.

### Build the FAISS index

```powershell
python build_faiss.py --csv data\enriched_requirements.csv --out faiss_store --model all-MiniLM-L6-v2
```

This produces `llm/faiss_store/faiss_index.bin` and `llm/faiss_store/faiss_meta.pkl`.

### Query the index

```powershell
python query_rag.py --query "Which requirements relate to security and payment?" --index faiss_store/faiss_index.bin --meta faiss_store/faiss_meta.pkl --top-k 5
```

The script prints the retrieved chunks and a composed prompt you can send to the Groq LLM via the FastAPI service.

### Integrating with Groq

Use the `query_rag.py` prompt as the `context` or part of the `system` message to the Groq model. Keep the generation model lightweight for faster responses.

### Next steps / enhancements

- Chunk longer requirements and index each chunk.
- Filter by metadata (domain, stakeholder) before searching.
- Cache embeddings and avoid rebuilding index for small updates.
- Build a small UI (Streamlit/Gradio) for interactive querying.
