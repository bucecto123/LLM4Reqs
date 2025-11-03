# main.py - FastAPI Entry Point with Groq
from fastapi import (
    FastAPI,
    HTTPException,
    Header,
    UploadFile,
    File,
    BackgroundTasks,
    Depends,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from groq import Groq
import os
from dotenv import load_dotenv
import json
from typing import Tuple, List
import uuid
from datetime import datetime
import asyncio

# Lazy import of RagManager (may raise at runtime if deps missing)
try:
    from rag import RagManager, get_project_lock
except Exception:
    RagManager = None
    get_project_lock = None

try:
    from build_faiss import build_index_for_project
except Exception:
    build_index_for_project = None

load_dotenv()

app = FastAPI(
    title="AI Requirements Generation Service",
    description="LLM-powered requirement extraction and generation using Groq",
    version="1.0.0",
)

# CORS configuration for Laravel
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8001", "http://localhost:3000"],  # Laravel & React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    # Visible runtime warning to help developers during local development
    print(
        "WARNING: GROQ_API_KEY is not set. Groq calls will fail until you set this in your .env file."
    )

groq_client = Groq(api_key=GROQ_API_KEY)
DEFAULT_MODEL = os.getenv("GROQ_MODEL", "moonshotai/kimi-k2-instruct-0905")

# API Key Authentication
LLM_API_KEY = os.getenv("LLM_API_KEY", "dev-secret-key-12345")  # Change in production!
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# Knowledge Base configuration
KB_BASE_DIR = os.getenv("KB_BASE_DIR", "faiss_store")
KB_MODEL = os.getenv("KB_MODEL", "all-MiniLM-L6-v2")

# In-memory job tracking (use Redis/DB in production)
_build_jobs: Dict[str, Dict[str, Any]] = {}
_build_jobs_lock = asyncio.Lock()


# RAG configuration (environment-controllable)
def _clean_env(val: str):
    """Strip surrounding whitespace and quotes, return None for empty strings."""
    if val is None:
        return None
    v = str(val).strip()
    # remove surrounding quotes if present
    if (v.startswith('"') and v.endswith('"')) or (
        v.startswith("'") and v.endswith("'")
    ):
        v = v[1:-1]
    v = v.strip()
    if v == "":
        return None
    return v


# Read and normalize env vars
_raw_rag_enabled = _clean_env(os.getenv("RAG_ENABLED", "true"))
RAG_ENABLED = (
    str(_raw_rag_enabled).lower() in ("1", "true", "yes")
    if _raw_rag_enabled is not None
    else True
)

_raw_rag_index = _clean_env(
    os.getenv("RAG_INDEX_PATH", "llm/faiss_store/faiss_index.bin")
)
RAG_INDEX_PATH = (
    os.path.normpath(_raw_rag_index)
    if _raw_rag_index
    else os.path.normpath("llm/faiss_store/faiss_index.bin")
)


# If the env-provided value contains control characters (dotEnv may have unescaped sequences like \f -> formfeed),
# try to read the raw .env file and parse the value without processing escapes.
def _contains_control_chars(s: str) -> bool:
    return any(ord(c) < 32 for c in s) if s is not None else False


if _contains_control_chars(_raw_rag_index):
    try:
        with open(
            os.path.join(os.path.dirname(__file__), ".env"), "r", encoding="utf-8"
        ) as fh:
            for line in fh:
                if line.strip().startswith("RAG_INDEX_PATH"):
                    # split on first '=' and preserve backslashes literally
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        raw_val = parts[1].strip()
                        # remove surrounding quotes if present
                        if (raw_val.startswith('"') and raw_val.endswith('"')) or (
                            raw_val.startswith("'") and raw_val.endswith("'")
                        ):
                            raw_val = raw_val[1:-1]
                        raw_val = raw_val.strip()
                        if raw_val:
                            RAG_INDEX_PATH = os.path.normpath(raw_val)
                    break
    except Exception as e:
        print(f"Failed to parse raw .env for RAG_INDEX_PATH fallback: {e}")

_raw_rag_meta = _clean_env(os.getenv("RAG_META_PATH", "llm/faiss_store/faiss_meta.pkl"))
RAG_META_PATH = (
    os.path.normpath(_raw_rag_meta)
    if _raw_rag_meta
    else os.path.normpath("llm/faiss_store/faiss_meta.pkl")
)

if _contains_control_chars(_raw_rag_meta):
    try:
        with open(
            os.path.join(os.path.dirname(__file__), ".env"), "r", encoding="utf-8"
        ) as fh:
            for line in fh:
                if line.strip().startswith("RAG_META_PATH"):
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        raw_val = parts[1].strip()
                        if (raw_val.startswith('"') and raw_val.endswith('"')) or (
                            raw_val.startswith("'") and raw_val.endswith("'")
                        ):
                            raw_val = raw_val[1:-1]
                        raw_val = raw_val.strip()
                        if raw_val:
                            RAG_META_PATH = os.path.normpath(raw_val)
                    break
    except Exception as e:
        print(f"Failed to parse raw .env for RAG_META_PATH fallback: {e}")

_raw_rag_model = _clean_env(os.getenv("RAG_MODEL", "all-MiniLM-L6-v2"))
RAG_MODEL = _raw_rag_model or "all-MiniLM-L6-v2"
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "5"))
RAG_SIM_THRESHOLD = float(os.getenv("RAG_SIM_THRESHOLD", "0.35"))
# comma-separated keywords that strongly signal RAG is needed
RAG_KEYWORDS = os.getenv(
    "RAG_KEYWORDS",
    "requirement,requirements,specification,standard,security,privacy,compliance,regulation,payment,billing",
).split(",")

# internal lazy-loaded artifacts
_rag_manager = None
_rag_index = None
_rag_chunks = None
_rag_available = False

# ==================== REQUEST/RESPONSE MODELS ====================


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    # Avoid mutable default; normalize to an empty list in the endpoint
    conversation_history: Optional[List[ChatMessage]] = None
    context: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    tokens_used: int
    model: str


class ExtractionRequest(BaseModel):
    text: str
    document_type: Optional[str] = "meeting_notes"


class Requirement(BaseModel):
    requirement_text: str
    title: Optional[str] = None  # Optional title field
    requirement_type: str  # functional, non-functional, constraint, assumption
    priority: str  # high, medium, low
    confidence_score: float


class ExtractionResponse(BaseModel):
    requirements: List[Requirement]
    total_extracted: int
    tokens_used: int


class PersonaGenerationRequest(BaseModel):
    requirement_text: str
    persona_name: str  # Developer, Business Analyst, Manager
    persona_prompt: str


class PersonaGenerationResponse(BaseModel):
    persona_view: str
    tokens_used: int


class ConflictDetectionRequest(BaseModel):
    requirements: List[Dict[str, Any]]


class Conflict(BaseModel):
    requirement_id_1: int
    requirement_id_2: int
    conflict_description: str
    severity: str


class ConflictDetectionResponse(BaseModel):
    conflicts: List[Conflict]
    total_conflicts: int


# ==================== NEW KB API MODELS ====================


class DocumentChunk(BaseModel):
    id: int
    text: str
    meta: Dict[str, Any] = {}


class ProcessDocumentRequest(BaseModel):
    project_id: str
    document_content: Optional[str] = None
    document_url: Optional[str] = None
    document_type: Optional[str] = "requirements"


class ProcessDocumentResponse(BaseModel):
    project_id: str
    requirements: List[Requirement]
    chunks: List[DocumentChunk]
    total_chunks: int
    tokens_used: int


class BuildKBRequest(BaseModel):
    project_id: str
    documents: List[Dict[str, Any]]  # List of {content: str, type: str, meta: dict}
    mode: str = Field(default="async", pattern="^(async|sync)$")


class BuildKBResponse(BaseModel):
    project_id: str
    job_id: Optional[str] = None  # Present in async mode
    status: str  # "queued", "completed", "failed"
    message: str
    index_path: Optional[str] = None
    total_chunks: Optional[int] = None


class IncrementalKBRequest(BaseModel):
    project_id: str
    documents: List[Dict[str, Any]]


class IncrementalKBResponse(BaseModel):
    project_id: str
    status: str
    message: str
    added_chunks: int
    total_chunks: int


class QueryKBRequest(BaseModel):
    project_id: str
    query: str
    top_k: int = Field(default=5, ge=1, le=20)


class QueryKBResponse(BaseModel):
    project_id: str
    query: str
    results: List[Dict[str, Any]]
    total_results: int


class KBStatusResponse(BaseModel):
    project_id: str
    exists: bool
    version: int
    last_built_at: Optional[str]
    total_chunks: int
    error: Optional[str] = None


# ==================== PROMPT TEMPLATES ====================

EXTRACTION_PROMPT = """You are Fishy, an expert business analyst. Extract software requirements from the following text.

Text:
{text}

Instructions:
1. Extract clear, specific requirements
2. Classify each as: functional, non-functional, constraint, or assumption
3. Assign priority: high, medium, or low
4. Provide a confidence score (0.0 to 1.0)
5. Return ONLY valid JSON, no markdown formatting, no explanations

Return format (MUST be valid JSON):
{{
  "requirements": [
    {{
      "requirement_text": "The system must...",
      "title": "Brief descriptive title",  # Optional, can be generated from text if not provided
      "requirement_type": "functional",
      "priority": "high",
      "confidence_score": 0.95
    }}
  ]
}}"""

CHAT_SYSTEM_PROMPT = """You are Fishy, an AI assistant specialized in software requirements engineering. 
You help users understand, refine, and document software requirements.
Be clear, concise, and technical when needed. Always provide actionable advice."""

PERSONA_PROMPT_TEMPLATE = """Rewrite the following requirement from the perspective of a {persona_name}.

Original Requirement:
{requirement_text}

Instructions:
- Focus on what matters most to this persona
- Be specific and detailed
- Use appropriate technical language for this persona
- Highlight key concerns and considerations

Provide the rewritten requirement:"""

CONFLICT_DETECTION_PROMPT = """Analyze the following requirements and identify any conflicts or contradictions.

Requirements:
{requirements_text}

Instructions:
1. Look for direct contradictions
2. Identify incompatible features
3. Find conflicting priorities or constraints
4. Return ONLY valid JSON, no markdown, no explanations

Return format (MUST be valid JSON):
{{
  "conflicts": [
    {{
      "requirement_id_1": 1,
      "requirement_id_2": 3,
      "conflict_description": "Requirement 1 requires real-time sync while Requirement 3 specifies batch processing",
      "severity": "high"
    }}
  ]
}}

If no conflicts found, return: {{"conflicts": []}}"""

# ==================== HELPER FUNCTIONS ====================


async def verify_api_key(api_key: str = Depends(api_key_header)):
    """Verify API key for protected endpoints."""
    if api_key != LLM_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")
    return api_key


def call_groq_chat(
    messages: List[Dict], max_tokens: int = 1000, temperature: float = 0.7
) -> tuple:
    """Call Groq API and return response + token usage"""
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=messages,
            model=DEFAULT_MODEL,
            max_tokens=max_tokens,
            temperature=temperature,
        )

        content = chat_completion.choices[0].message.content
        tokens_used = chat_completion.usage.total_tokens

        return content, tokens_used
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")


def _load_rag_artifacts() -> Tuple[bool, object, list]:
    """Lazily load RagManager, FAISS index and metadata. Returns (available, index, chunks)."""
    global _rag_manager, _rag_index, _rag_chunks, _rag_available
    if not RAG_ENABLED:
        return False, None, None

    if _rag_available:
        return True, _rag_index, _rag_chunks

    if RagManager is None:
        # sentence-transformers or faiss not installed or rag import failed
        _rag_available = False
        return False, None, None

    try:
        _rag_manager = RagManager(model_name=RAG_MODEL)
        _rag_index, _rag_chunks = _rag_manager.load_index_and_meta(
            RAG_INDEX_PATH, RAG_META_PATH
        )
        _rag_available = True
        return True, _rag_index, _rag_chunks
    except Exception as e:
        print(f"RAG load failed: {e}")
        _rag_available = False
        return False, None, None


def needs_rag(user_query: str, use_model: bool = True) -> bool:
    """Decide whether to use RAG. First apply rule-based keywords, then optional model-based similarity check.

    Returns True if RAG should be used.
    """
    if not RAG_ENABLED:
        return False

    q = (user_query or "").lower()
    # Rule-based: if any keyword appears
    for kw in RAG_KEYWORDS:
        kw = kw.strip().lower()
        if not kw:
            continue
        if kw in q:
            return True

    # If model-based classification requested, try similarity against the index
    if use_model:
        avail, index, chunks = _load_rag_artifacts()
        if not avail:
            return False
        try:
            # use the rag manager to query top-1 and inspect score
            results = _rag_manager.query(user_query, index, chunks, top_k=1)
            if results and len(results) > 0:
                top_score = results[0].get("score", 0.0)
                return float(top_score) >= float(RAG_SIM_THRESHOLD)
        except Exception as e:
            print(f"RAG classification error: {e}")
            return False

    return False


def _build_rag_context_message(retrieved: list) -> str:
    """Format retrieved chunks into a single system message string."""
    if not retrieved:
        return ""
    lines = [
        "Use the following retrieved context when helpful (do not fabricate answers):\n"
    ]
    for i, item in enumerate(retrieved, start=1):
        # include score for debugging usefulness
        lines.append(
            f"{i}. {item.get('text', '')} (score: {item.get('score', 0.0):.4f})"
        )
    lines.append("\nIf the context does not contain the answer, say so explicitly.")
    return "\n".join(lines)


def parse_json_response(content: str) -> Dict:
    """Parse JSON from LLM response, handling markdown code blocks"""
    # Remove markdown code blocks if present
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]

    content = content.strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        # Try to find JSON in the response
        start = content.find("{")
        end = content.rfind("}") + 1
        if start != -1 and end > start:
            try:
                return json.loads(content[start:end])
            except:
                pass
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse LLM response as JSON. Response: {content[:200]}",
        )


def _attempt_json_recovery(content: str) -> Dict:
    """
    Attempt to recover incomplete/truncated JSON from LLM response.
    This handles cases where the response was cut off due to max_tokens limit.
    """
    content = content.strip()
    
    # Remove markdown code blocks
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()
    
    # Find the start of JSON
    start = content.find("{")
    if start == -1:
        return None
    
    # Try to find the requirements array
    req_start = content.find('"requirements"')
    if req_start == -1:
        return None
    
    # Find the array start
    array_start = content.find("[", req_start)
    if array_start == -1:
        return None
    
    # Try to salvage complete requirement objects
    requirements = []
    current_pos = array_start + 1
    brace_count = 0
    obj_start = -1
    
    for i in range(current_pos, len(content)):
        char = content[i]
        
        if char == '{':
            if brace_count == 0:
                obj_start = i
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0 and obj_start != -1:
                # We have a complete object
                try:
                    obj_str = content[obj_start:i+1]
                    req_obj = json.loads(obj_str)
                    # Validate it has required fields
                    if "requirement_text" in req_obj:
                        requirements.append(req_obj)
                except:
                    pass
                obj_start = -1
    
    if requirements:
        print(f"JSON recovery successful: salvaged {len(requirements)} requirements")
        return {"requirements": requirements}
    
    return None


def _get_rag_manager():
    """Get or create a RagManager instance."""
    if RagManager is None:
        raise HTTPException(
            status_code=500,
            detail="RAG dependencies not installed. Install sentence-transformers and faiss-cpu.",
        )
    return RagManager(model_name=KB_MODEL)


def _prepare_document_chunks(documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Convert documents to chunks format expected by RagManager."""
    chunks = []
    for idx, doc in enumerate(documents):
        content = doc.get("content", "")
        doc_type = doc.get("type", "document")
        meta = doc.get("meta", {})

        chunks.append({"id": idx, "text": content, "meta": {"type": doc_type, **meta}})
    return chunks


async def _build_kb_async(job_id: str, project_id: str, chunks: List[Dict[str, Any]]):
    """Background task to build knowledge base."""
    global _build_jobs

    try:
        # Update job status
        async with _build_jobs_lock:
            _build_jobs[job_id]["status"] = "building"
            _build_jobs[job_id]["started_at"] = datetime.utcnow().isoformat()

        # Build index
        result = build_index_for_project(
            project_id=project_id,
            chunks=chunks,
            base_dir=KB_BASE_DIR,
            model_name=KB_MODEL,
        )

        # Update job status
        async with _build_jobs_lock:
            _build_jobs[job_id]["status"] = "completed"
            _build_jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()
            _build_jobs[job_id]["result"] = result
            _build_jobs[job_id]["total_chunks"] = len(chunks)

    except Exception as e:
        async with _build_jobs_lock:
            _build_jobs[job_id]["status"] = "failed"
            _build_jobs[job_id]["error"] = str(e)
            _build_jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()


# ==================== API ENDPOINTS ====================


@app.get("/")
def read_root():
    return {
        "service": "AI Requirements Generation Service (Groq)",
        "status": "running",
        "version": "1.0.0",
        "model": DEFAULT_MODEL,
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "model": DEFAULT_MODEL,
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint for conversational AI

    Usage:
    POST /api/chat
    {
        "message": "Explain functional requirements",
        "conversation_history": [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi! How can I help?"}
        ],
        "context": "Optional context about the project"
    }
    """
    try:
        messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]

        # Add context if provided
        if request.context:
            messages.append(
                {"role": "system", "content": f"Project Context: {request.context}"}
            )

        # Normalize conversation history (avoid None) and limit to last 10 messages to save tokens
        history = request.conversation_history or []
        for msg in history[-10:]:
            # Accept either ChatMessage Pydantic models or plain dicts
            if isinstance(msg, dict):
                role = msg.get("role")
                content = msg.get("content")
            else:
                role = getattr(msg, "role", None)
                content = getattr(msg, "content", None)

            if role and content:
                messages.append({"role": role, "content": content})

        # Add current message
        messages.append({"role": "user", "content": request.message})

        # RAG decision: decide whether to enrich with retrieved context
        try:
            use_rag = needs_rag(request.message, use_model=True)
        except Exception as e:
            # If RAG check fails for any reason, fall back to no RAG
            print(f"RAG decision error: {e}")
            use_rag = False

        if use_rag:
            avail, index, chunks = _load_rag_artifacts()
            if avail and _rag_manager is not None:
                try:
                    retrieved = _rag_manager.query(
                        request.message, index, chunks, top_k=RAG_TOP_K
                    )
                    rag_system = _build_rag_context_message(retrieved)
                    if rag_system:
                        # Prepend retrieved context as a system instruction to guide the model
                        messages.insert(1, {"role": "system", "content": rag_system})
                except Exception as e:
                    print(f"RAG retrieval failed: {e}")
                    # continue without RAG

        # Call Groq
        response_text, tokens_used = call_groq_chat(
            messages, max_tokens=2000, temperature=0.7
        )

        return ChatResponse(
            response=response_text, tokens_used=tokens_used, model=DEFAULT_MODEL
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/extract", response_model=ExtractionResponse)
async def extract_requirements(request: ExtractionRequest):
    """
    Extract requirements from text

    Usage:
    POST /api/extract
    {
        "text": "The app should allow users to login. It must be fast and secure.",
        "document_type": "meeting_notes"
    }
    """
    try:
        prompt = EXTRACTION_PROMPT.format(text=request.text)

        messages = [
            {
                "role": "system",
                "content": "You are Fishy, a requirements extraction expert. Always return valid JSON. If the text is long, prioritize extracting the most important requirements within your response limit.",
            },
            {"role": "user", "content": prompt},
        ]

        # Increase max_tokens significantly to handle large PDFs
        # Most models can handle 4000-8000 tokens in responses
        max_tokens_to_use = 6000
        
        # Use lower temperature for more consistent JSON output
        response_text, tokens_used = call_groq_chat(
            messages, max_tokens=max_tokens_to_use, temperature=0.3
        )
        
        # Try to parse the response
        try:
            parsed_data = parse_json_response(response_text)
        except HTTPException as parse_error:
            # If JSON parsing failed due to truncation, try to salvage what we can
            print(f"Initial JSON parsing failed, attempting recovery: {parse_error.detail}")
            
            # Try to extract and fix incomplete JSON
            parsed_data = _attempt_json_recovery(response_text)
            
            if not parsed_data or "requirements" not in parsed_data:
                # If recovery failed, raise the original error
                raise parse_error

        requirements = [
            Requirement(**req) for req in parsed_data.get("requirements", [])
        ]

        return ExtractionResponse(
            requirements=requirements,
            total_extracted=len(requirements),
            tokens_used=tokens_used,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/persona/generate", response_model=PersonaGenerationResponse)
async def generate_persona_view(request: PersonaGenerationRequest):
    """
    Generate persona-specific view of a requirement

    Usage:
    POST /api/persona/generate
    {
        "requirement_text": "The system must process 1000 transactions per second",
        "persona_name": "Developer",
        "persona_prompt": "Focus on technical implementation, architecture, and scalability"
    }
    """
    try:
        prompt = PERSONA_PROMPT_TEMPLATE.format(
            persona_name=request.persona_name, requirement_text=request.requirement_text
        )

        # Add persona-specific guidance
        system_prompt = f"You are a {request.persona_name} analyzing requirements. {request.persona_prompt}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]

        response_text, tokens_used = call_groq_chat(
            messages, max_tokens=2000, temperature=0.7
        )

        return PersonaGenerationResponse(
            persona_view=response_text, tokens_used=tokens_used
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/conflicts/detect", response_model=ConflictDetectionResponse)
async def detect_conflicts(request: ConflictDetectionRequest):
    """
    Detect conflicts between requirements

    Usage:
    POST /api/conflicts/detect
    {
        "requirements": [
            {"id": 1, "text": "Must work offline"},
            {"id": 2, "text": "Requires real-time cloud sync"}
        ]
    }
    """
    try:
        # Format requirements for prompt (use .get to be resilient to missing keys)
        requirements_text = "\n".join(
            [f"ID {req.get('id')}: {req.get('text')}" for req in request.requirements]
        )

        prompt = CONFLICT_DETECTION_PROMPT.format(requirements_text=requirements_text)

        messages = [
            {
                "role": "system",
                "content": "You are Fishy, an expert at detecting requirement conflicts. Always return valid JSON.",
            },
            {"role": "user", "content": prompt},
        ]

        response_text, tokens_used = call_groq_chat(
            messages, max_tokens=2000, temperature=0.3
        )
        parsed_data = parse_json_response(response_text)

        conflicts = [
            Conflict(**conflict) for conflict in parsed_data.get("conflicts", [])
        ]

        return ConflictDetectionResponse(
            conflicts=conflicts, total_conflicts=len(conflicts)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== KNOWLEDGE BASE API ENDPOINTS ====================


@app.post("/process_document", response_model=ProcessDocumentResponse)
async def process_document(
    request: ProcessDocumentRequest, api_key: str = Depends(verify_api_key)
):
    """
    Process a document and extract requirements with chunk metadata.

    Usage:
    POST /process_document
    Headers: X-API-Key: your-api-key
    {
        "project_id": "proj_123",
        "document_content": "The system must allow users to login...",
        "document_type": "requirements"
    }
    """
    try:
        if not request.document_content and not request.document_url:
            raise HTTPException(
                status_code=400,
                detail="Either document_content or document_url must be provided",
            )

        # Use document_content (document_url fetching can be added later)
        content = request.document_content or ""

        # Extract requirements using existing extraction endpoint logic
        extraction_req = ExtractionRequest(
            text=content, document_type=request.document_type
        )
        prompt = EXTRACTION_PROMPT.format(text=extraction_req.text)

        messages = [
            {
                "role": "system",
                "content": "You are Fishy, a requirements extraction expert. Always return valid JSON.",
            },
            {"role": "user", "content": prompt},
        ]

        response_text, tokens_used = call_groq_chat(
            messages, max_tokens=3000, temperature=0.3
        )
        parsed_data = parse_json_response(response_text)

        requirements = [
            Requirement(**req) for req in parsed_data.get("requirements", [])
        ]

        # Create chunks from requirements
        chunks = []
        for idx, req in enumerate(requirements):
            chunk_text = f"Requirement: {req.requirement_text}\nType: {req.requirement_type}\nPriority: {req.priority}"
            chunks.append(
                DocumentChunk(
                    id=idx,
                    text=chunk_text,
                    meta={
                        "requirement_type": req.requirement_type,
                        "priority": req.priority,
                        "confidence_score": req.confidence_score,
                        "document_type": request.document_type,
                    },
                )
            )

        return ProcessDocumentResponse(
            project_id=request.project_id,
            requirements=requirements,
            chunks=chunks,
            total_chunks=len(chunks),
            tokens_used=tokens_used,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/kb/build", response_model=BuildKBResponse)
async def build_kb(
    request: BuildKBRequest,
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key),
):
    """
    Build knowledge base for a project. Supports async (returns job_id) and sync modes.

    Usage:
    POST /kb/build
    Headers: X-API-Key: your-api-key
    {
        "project_id": "proj_123",
        "documents": [
            {"content": "Requirement 1...", "type": "functional", "meta": {}},
            {"content": "Requirement 2...", "type": "non-functional", "meta": {}}
        ],
        "mode": "async"
    }
    """
    try:
        if not request.documents:
            raise HTTPException(
                status_code=400, detail="Documents list cannot be empty"
            )

        # Prepare chunks
        chunks = _prepare_document_chunks(request.documents)

        if request.mode == "async":
            # Create job
            job_id = f"job_{uuid.uuid4().hex[:12]}"

            async with _build_jobs_lock:
                _build_jobs[job_id] = {
                    "job_id": job_id,
                    "project_id": request.project_id,
                    "status": "queued",
                    "created_at": datetime.utcnow().isoformat(),
                    "total_docs": len(request.documents),
                }

            # Schedule background task
            background_tasks.add_task(
                _build_kb_async, job_id, request.project_id, chunks
            )

            return BuildKBResponse(
                project_id=request.project_id,
                job_id=job_id,
                status="queued",
                message=f"Knowledge base build queued for project {request.project_id}",
            )
        else:
            # Synchronous build
            result = build_index_for_project(
                project_id=request.project_id,
                chunks=chunks,
                base_dir=KB_BASE_DIR,
                model_name=KB_MODEL,
            )

            return BuildKBResponse(
                project_id=request.project_id,
                job_id=None,
                status="completed",
                message=f"Knowledge base built successfully for project {request.project_id}",
                index_path=result.get("index_path"),
                total_chunks=len(chunks),
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/kb/incremental", response_model=IncrementalKBResponse)
async def incremental_kb_update(
    request: IncrementalKBRequest, api_key: str = Depends(verify_api_key)
):
    """
    Add documents incrementally to existing project knowledge base.

    Usage:
    POST /kb/incremental
    Headers: X-API-Key: your-api-key
    {
        "project_id": "proj_123",
        "documents": [
            {"content": "New requirement...", "type": "functional", "meta": {}}
        ]
    }
    """
    try:
        if not request.documents:
            raise HTTPException(
                status_code=400, detail="Documents list cannot be empty"
            )

        rag = _get_rag_manager()
        index_path, meta_path = rag.get_project_paths(KB_BASE_DIR, request.project_id)

        # Check if index exists
        if not os.path.exists(index_path):
            raise HTTPException(
                status_code=404,
                detail=f"Knowledge base not found for project {request.project_id}. Use /kb/build first.",
            )

        # Prepare new chunks
        new_chunks = _prepare_document_chunks(request.documents)

        # Incremental add
        index, updated_chunks = rag.incremental_add(
            index_path=index_path,
            meta_path=meta_path,
            new_chunks=new_chunks,
            project_id=request.project_id,
        )

        return IncrementalKBResponse(
            project_id=request.project_id,
            status="completed",
            message=f"Added {len(new_chunks)} chunks to project {request.project_id}",
            added_chunks=len(new_chunks),
            total_chunks=len(updated_chunks),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/kb/query", response_model=QueryKBResponse)
async def query_kb(request: QueryKBRequest, api_key: str = Depends(verify_api_key)):
    """
    Query knowledge base for relevant chunks.

    Usage:
    POST /kb/query
    Headers: X-API-Key: your-api-key
    {
        "project_id": "proj_123",
        "query": "What are the authentication requirements?",
        "top_k": 5
    }
    """
    try:
        rag = _get_rag_manager()
        index_path, meta_path = rag.get_project_paths(KB_BASE_DIR, request.project_id)

        # Check if index exists
        if not os.path.exists(index_path):
            raise HTTPException(
                status_code=404,
                detail=f"Knowledge base not found for project {request.project_id}",
            )

        # Load index and query
        index, chunks = rag.load_index_and_meta(index_path, meta_path)
        results = rag.query(request.query, index, chunks, top_k=request.top_k)

        return QueryKBResponse(
            project_id=request.project_id,
            query=request.query,
            results=results,
            total_results=len(results),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/kb/status/{project_id}", response_model=KBStatusResponse)
async def get_kb_status(project_id: str, api_key: str = Depends(verify_api_key)):
    """
    Get knowledge base status for a project.

    Usage:
    GET /kb/status/proj_123
    Headers: X-API-Key: your-api-key
    """
    try:
        rag = _get_rag_manager()
        index_path, meta_path = rag.get_project_paths(KB_BASE_DIR, project_id)

        status = rag.get_kb_status(index_path, meta_path)

        return KBStatusResponse(
            project_id=project_id,
            exists=status["exists"],
            version=status["version"],
            last_built_at=status["last_built_at"],
            total_chunks=status["total_chunks"],
            error=status["error"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/kb/job/{job_id}")
async def get_job_status(job_id: str, api_key: str = Depends(verify_api_key)):
    """
    Get status of an async build job.

    Usage:
    GET /kb/job/job_abc123
    Headers: X-API-Key: your-api-key
    """
    async with _build_jobs_lock:
        job = _build_jobs.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    return job


# ==================== TESTING ENDPOINT ====================


@app.post("/api/test")
async def test_groq():
    """Simple test endpoint to verify Groq connection"""
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": "Say 'Hello, FastAPI with Groq!'"}],
            model=DEFAULT_MODEL,
            max_tokens=50,
        )
        return {
            "success": True,
            "response": chat_completion.choices[0].message.content,
            "model": DEFAULT_MODEL,
            "tokens_used": chat_completion.usage.total_tokens,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

# ==================== .env.example ====================
"""
# Groq LLM Configuration (for requirement extraction)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx
GROQ_MODEL=mixtral-8x7b-32768

# Available FREE Groq models:
# mixtral-8x7b-32768          - Best for complex tasks, 32k context (RECOMMENDED)
# llama-3.1-8b-instant        - Fastest, good for simple tasks
# llama-3.1-70b-versatile     - Most powerful, slower
# llama3-70b-8192             - Good balance
# llama3-8b-8192              - Fast and efficient
# gemma2-9b-it                - Google's model, good for instructions

# Knowledge Base API Authentication (CHANGE IN PRODUCTION!)
LLM_API_KEY=dev-secret-key-12345

# Knowledge Base Configuration
KB_BASE_DIR=faiss_store                    # Base directory for all project indexes
KB_MODEL=all-MiniLM-L6-v2                  # SentenceTransformer model for embeddings

# Legacy RAG Configuration (for existing chat endpoint)
RAG_ENABLED=true
RAG_INDEX_PATH=faiss_store/faiss_index.bin
RAG_META_PATH=faiss_store/faiss_meta.pkl
RAG_MODEL=all-MiniLM-L6-v2
RAG_TOP_K=5
RAG_SIM_THRESHOLD=0.35
RAG_KEYWORDS=requirement,requirements,specification,standard,security,privacy,compliance,regulation,payment,billing
"""
