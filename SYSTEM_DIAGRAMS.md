# System Architecture Diagrams

## Complete System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LLM4Reqs - Full Stack                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Browser    │  User uploads document + asks questions
│  (Frontend)  │
└──────┬───────┘
       │ HTTP + JWT Token
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    Laravel Backend (Port 8001)                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────┐    ┌─────────────────┐    ┌────────────────────┐   │
│  │ DocumentController│  │ ProjectKBController│ │ ConversationController│  │
│  └────────┬───────┘    └────────┬────────┘    └──────────┬─────────┘   │
│           │                     │                         │              │
│           ▼                     ▼                         ▼              │
│  ┌────────────────┐    ┌─────────────────┐    ┌────────────────────┐   │
│  │ DocumentService │    │   KBBuildJob    │    │ ConversationService │   │
│  └────────────────┘    └────────┬────────┘    └──────────┬─────────┘   │
│                                  │                         │              │
│                                  └─────┬───────────────────┘              │
│                                        │                                  │
│                                        ▼                                  │
│                              ┌─────────────────┐                         │
│                              │   LLMService    │ X-API-Key auth          │
│                              └────────┬────────┘                         │
│                                       │                                  │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │                     Database (SQLite/MySQL)                  │        │
│  ├─────────────────────────────────────────────────────────────┤        │
│  │ ▪ projects                  ▪ knowledge_bases               │        │
│  │ ▪ documents                 ▪ requirements                  │        │
│  │ ▪ conversations             ▪ requirement_conflicts         │        │
│  │ ▪ messages                  ▪ jobs (queue)                  │        │
│  └─────────────────────────────────────────────────────────────┘        │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │ HTTP POST with X-API-Key header
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    LLM Service (FastAPI - Port 8000)                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     API Endpoints                               │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │ POST /kb/build        - Build FAISS index                       │    │
│  │ POST /kb/query        - Semantic search                         │    │
│  │ POST /kb/incremental  - Add documents                           │    │
│  │ GET  /kb/status/{id}  - Get KB metadata                         │    │
│  │ GET  /kb/job/{id}     - Check job status                        │    │
│  │ POST /process_document - Extract requirements                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                   │                                      │
│                                   ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     RAG Manager (rag.py)                         │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │ ▪ SentenceTransformer (embeddings)                              │    │
│  │ ▪ FAISS (vector search)                                          │    │
│  │ ▪ Per-project indexes                                            │    │
│  │ ▪ Version management                                             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                   │                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                 File System Storage                              │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │ faiss_store/                                                     │    │
│  │   ├── project_1/                                                 │    │
│  │   │   ├── faiss_index.bin    (vector index)                     │    │
│  │   │   └── faiss_meta.pkl     (metadata + version)               │    │
│  │   └── project_2/                                                 │    │
│  │       └── ...                                                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                   │                                      │
│                                   ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                   External LLM APIs                              │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │ ▪ Groq (requirement extraction)                                  │    │
│  │ ▪ OpenAI/Anthropic (optional - future)                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Knowledge Base Build Workflow

```
┌──────────┐
│  START   │ User clicks "Build KB" button
└────┬─────┘
     │
     ▼
┌─────────────────────────────────────┐
│ 1. Frontend sends request           │
│    POST /api/projects/1/kb/build    │
└────┬────────────────────────────────┘
     │ Authorization: Bearer {JWT}
     ▼
┌─────────────────────────────────────┐
│ 2. ProjectKBController              │
│    - Validates project exists       │
│    - Checks if already building     │
│    - Creates/updates KB record      │
└────┬────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ 3. Dispatch KBBuildJob              │
│    - Job ID: kb_build_1             │
│    - Status: queued                 │
└────┬────────────────────────────────┘
     │ Returns immediately with job_id
     │
     ├──> Response to Frontend: {"job_id": "kb_build_1", "status": "queued"}
     │
     ▼
┌─────────────────────────────────────┐
│ 4. KBBuildJob executes (background) │
│    - Acquire cache lock             │
│    - Fetch project documents        │
│    - Transform to LLM format        │
└────┬────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ 5. LLMService->buildKnowledgeBase() │
│    POST http://localhost:8000/kb/build
│    Headers: X-API-Key: dev-secret-key-12345
│    Body: {                          │
│      "project_id": "1",             │
│      "documents": [...],            │
│      "mode": "sync"                 │
│    }                                │
└────┬────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ 6. LLM Service (FastAPI)            │
│    - Generate embeddings            │
│    - Build FAISS index              │
│    - Save to faiss_store/1/         │
└────┬────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ 7. LLM Service returns result       │
│    {                                │
│      "status": "completed",         │
│      "index_path": "...",           │
│      "total_chunks": 50             │
│    }                                │
└────┬────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ 8. KBBuildJob updates KB model      │
│    - kb->markAsReady($result)       │
│    - Status: ready                  │
│    - Version: 1                     │
│    - Documents count: 50            │
│    - Last built: now()              │
└────┬────────────────────────────────┘
     │
     ▼
┌──────────┐
│   DONE   │ KB ready for queries!
└──────────┘
```

---

## RAG-Powered Conversation Flow

```
┌──────────┐
│  START   │ User sends message in project chat
└────┬─────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 1. Frontend sends message                           │
│    POST /api/conversations/123/messages             │
│    {                                                │
│      "role": "user",                                │
│      "content": "What are the auth requirements?"   │
│    }                                                │
└────┬────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 2. ConversationController->sendMessage()            │
│    - Load conversation with project_id              │
│    - Pass to ConversationService                    │
└────┬────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 3. ConversationService->sendMessage()               │
│    - Save user message to DB                        │
│    - Check: conversation->project_id exists?        │
└────┬────────────────────────────────────────────────┘
     │ Yes, project_id = 1
     ▼
┌─────────────────────────────────────────────────────┐
│ 4. Check KB status                                  │
│    $kb = KnowledgeBase::where('project_id', 1)->first()
│    if ($kb && $kb->isReady()) { ... }               │
└────┬────────────────────────────────────────────────┘
     │ KB is ready!
     ▼
┌─────────────────────────────────────────────────────┐
│ 5. Query KB for relevant context                    │
│    $results = LLMService->queryKB(1, $message, 5)   │
│                                                     │
│    POST http://localhost:8000/kb/query             │
│    {                                                │
│      "project_id": "1",                             │
│      "query": "What are the auth requirements?",    │
│      "top_k": 5                                     │
│    }                                                │
└────┬────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 6. LLM Service (FAISS search)                       │
│    - Load project_1 index                           │
│    - Generate query embedding                       │
│    - Search top-5 similar chunks                    │
│    - Return with relevance scores                   │
└────┬────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 7. LLM Service returns results                      │
│    {                                                │
│      "results": [                                   │
│        {                                            │
│          "content": "Users must login with email",  │
│          "type": "functional",                      │
│          "score": 0.87                              │
│        },                                           │
│        { ... 4 more chunks ... }                    │
│      ],                                             │
│      "scores": [0.87, 0.82, ...]                    │
│    }                                                │
└────┬────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 8. ConversationService builds KB context           │
│    $kbContext = "                                   │
│    === KNOWLEDGE BASE CONTEXT ===                   │
│    [Relevance: 0.87] Users must login with email    │
│    [Relevance: 0.82] Password must be 8+ chars      │
│    ... more chunks ...                              │
│    === END CONTEXT ===                              │
│    "                                                │
└────┬────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 9. Build enhanced prompt                            │
│    $enhancedContext = "                             │
│      You are helping with requirements engineering. │
│      The following are relevant requirements from   │
│      the project knowledge base. Use these to       │
│      provide accurate answers.                      │
│      " . $kbContext                                 │
└────┬────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 10. Call Groq/LLM for response                      │
│     LLMService->chat(                               │
│       message: "What are the auth requirements?",   │
│       history: [...previous messages...],           │
│       context: $enhancedContext                     │
│     )                                               │
└────┬────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 11. LLM generates context-aware response            │
│     "Based on the project requirements:             │
│      1. Users must login with email and password    │
│      2. Password must be at least 8 characters      │
│      3. Two-factor authentication is required       │
│      ..."                                           │
└────┬────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 12. Save AI message to DB                           │
│     - Role: assistant                               │
│     - Content: AI response                          │
│     - Tokens used: 150                              │
└────┬────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 13. Return to Frontend                              │
│     {                                               │
│       "user_message": {...},                        │
│       "ai_message": {                               │
│         "content": "Based on the project...",       │
│         "tokens_used": 150                          │
│       }                                             │
│     }                                               │
└────┬────────────────────────────────────────────────┘
     │
     ▼
┌──────────┐
│   DONE   │ User sees context-aware response! ✨
└──────────┘

Key Benefits:
✅ AI references actual project requirements
✅ Reduced token usage (only top-5 chunks, not all docs)
✅ More accurate and relevant responses
✅ Faster response time (less tokens to process)
```

---

## Database Schema Relationships

```
┌────────────────────┐
│      users         │
│                    │
│  id                │
│  name              │
│  email             │
│  password          │
└────────┬───────────┘
         │ owner_id
         │
         ▼
┌────────────────────┐           ┌──────────────────────┐
│     projects       │───────────│  knowledge_bases     │
│                    │  1:1      │                      │
│  id                │           │  id                  │
│  owner_id (FK)     │           │  project_id (FK)     │ UNIQUE
│  name              │           │  status (enum)       │
│  description       │           │  index_path          │
│  status            │           │  meta_path           │
└────────┬───────────┘           │  version             │
         │ 1:M                   │  documents_count     │
         │                       │  last_built_at       │
         ├──────────────────────>│  last_error          │
         │                       │  job_id              │
         │                       └──────────────────────┘
         │
         ├─────────────────────────────────┐
         │ 1:M                              │ 1:M
         ▼                                  ▼
┌────────────────────┐           ┌──────────────────────┐
│    documents       │           │   requirements       │
│                    │           │                      │
│  id                │           │  id                  │
│  project_id (FK)   │◄──────────│  project_id (FK)     │
│  original_filename │    M:1    │  document_id (FK)    │
│  content           │           │  title               │
│  file_type         │           │  content             │
│  status            │           │  requirement_text    │ NEW
└────────────────────┘           │  requirement_type    │ NEW
         │                       │  priority            │
         │ M:M                   │  confidence_score    │
         │                       │  status              │
         ▼                       │  source              │
┌────────────────────┐           │  source_doc          │ NEW
│  conversations     │           │  meta (JSON)         │ NEW
│                    │           └──────────┬───────────┘
│  id                │                      │ 1:M
│  project_id (FK)   │                      │
│  user_id (FK)      │                      ▼
│  title             │           ┌──────────────────────┐
│  context           │           │ requirement_conflicts│
└────────┬───────────┘           │                      │
         │ 1:M                   │  id                  │
         │                       │  project_id (FK)     │
         ▼                       │  requirement_id_1(FK)│
┌────────────────────┐           │  requirement_id_2(FK)│
│     messages       │           │  conflict_description│
│                    │           │  severity            │
│  id                │           │  resolution_status   │
│  conversation_id(FK)│          │  resolution_notes    │
│  role              │           │  resolved_at         │
│  content           │           └──────────────────────┘
│  model_used        │
│  tokens_used       │
└────────────────────┘

Legend:
  FK     = Foreign Key
  1:1    = One to One relationship
  1:M    = One to Many relationship
  M:M    = Many to Many relationship
  NEW    = New field added in this sprint
  UNIQUE = Unique constraint
```

---

## API Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              Two-Layer Authentication System                     │
└─────────────────────────────────────────────────────────────────┘

Layer 1: User → Backend (Sanctum JWT)
─────────────────────────────────────

┌──────────┐              ┌──────────────┐              ┌──────────┐
│  User    │   Login      │   Backend    │   Generate   │   DB     │
│ Browser  │─────────────>│  (Laravel)   │─────────────>│ (users)  │
└──────────┘              └──────────────┘              └──────────┘
     │                           │
     │   <── JWT Token ──────────┤
     │   eyJhbGciOiJIUzI1NiI...  │
     │                           │
     │   Subsequent requests     │
     │   Authorization: Bearer {JWT}
     │──────────────────────────>│
     │                           │
     │   ✅ Validated           │
     │<──────────────────────────┤


Layer 2: Backend → LLM Service (API Key)
─────────────────────────────────────────

┌──────────────┐              ┌──────────────┐
│   Backend    │   KB Query   │ LLM Service  │
│  (Laravel)   │─────────────>│  (FastAPI)   │
└──────────────┘              └──────────────┘
     │                               │
     │  Headers:                     │
     │  X-API-Key: dev-secret-key-12345
     │──────────────────────────────>│
     │                               │
     │                          Validate API Key
     │                               │
     │                          ✅ Authorized
     │<──────────────────────────────┤
     │                               │
     │   <── KB Results ─────────────┤


Complete Flow:
──────────────

User ─[JWT]─> Backend ─[API Key]─> LLM Service
 ▲                │
 │                │
 └────[Response]──┘

Key Points:
• Frontend NEVER sees LLM API key
• Backend NEVER exposes JWT generation to LLM
• Two separate security layers
• Each layer protects different boundaries
```

---

## File Storage Structure

```
LLM4Reqs/
│
├── backend/                        # Laravel application
│   ├── app/
│   │   ├── Models/
│   │   │   ├── KnowledgeBase.php   ← NEW
│   │   │   ├── Requirement.php     ← UPDATED
│   │   │   ├── Project.php         ← UPDATED
│   │   │   └── RequirementConflict.php ← UPDATED
│   │   ├── Services/
│   │   │   ├── LLMService.php      ← UPDATED (5 new methods)
│   │   │   └── ConversationService.php ← UPDATED (RAG integration)
│   │   ├── Jobs/
│   │   │   └── KBBuildJob.php      ← UPDATED
│   │   └── Http/Controllers/Api/
│   │       ├── ProjectKBController.php ← UPDATED (3 endpoints)
│   │       └── ProjectController.php   ← UPDATED (2 endpoints)
│   ├── database/
│   │   └── migrations/
│   │       ├── 2025_10_20_000001_create_knowledge_bases_table.php ← NEW
│   │       └── 2025_10_20_000002_add_kb_fields_to_requirements_table.php ← NEW
│   ├── routes/
│   │   └── api.php                 ← UPDATED (3 new routes)
│   ├── config/
│   │   └── services.php            ← UPDATED (api_key added)
│   └── .env.example                ← UPDATED
│
├── llm/                            # FastAPI service
│   ├── main.py                     ← (From previous sprint)
│   ├── rag.py                      ← (From previous sprint)
│   ├── build_faiss.py              ← (From previous sprint)
│   ├── requirements.txt            ← (From previous sprint)
│   ├── .env                        ← Configure: LLM_API_KEY
│   ├── faiss_store/                ← Created by KB build
│   │   ├── 1/                      # Project 1 KB
│   │   │   ├── faiss_index.bin
│   │   │   └── faiss_meta.pkl
│   │   └── 2/                      # Project 2 KB
│   │       ├── faiss_index.bin
│   │       └── faiss_meta.pkl
│   └── COMPLETE_KB_API_GUIDE.md    ← (From previous sprint)
│
└── Documentation/                  # Integration docs
    ├── BACKEND_LLM_INTEGRATION_GUIDE.md ← NEW (~500 lines)
    ├── TESTING_COMMANDS.md              ← NEW (~300 lines)
    ├── IMPLEMENTATION_SUMMARY.md        ← NEW (~600 lines)
    ├── SYSTEM_DIAGRAMS.md               ← NEW (this file)
    └── TEAM_TODOS_BACKEND_Thinh.md      ← UPDATED (marked complete)
```

---

**Created:** October 20, 2025  
**Purpose:** Visual reference for system architecture  
**Audience:** All team members (developers, DevOps, stakeholders)
