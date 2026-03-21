# main.py - FastAPI Entry Point with Groq
import warnings
warnings.filterwarnings('ignore')

from fastapi import (
    FastAPI,
    HTTPException,
    Header,
    UploadFile,
    File,
    BackgroundTasks,
    Depends,
)
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Tuple
import os
import json
import uuid
import asyncio
import threading
from dotenv import load_dotenv
from datetime import datetime

# LangChain imports
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

# Gemini (optional - for fallback)
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    GEMINI_AVAILABLE = True
except ImportError:
    ChatGoogleGenerativeAI = None
    GEMINI_AVAILABLE = False

from rag import RagManager, get_faiss_index
from build_faiss import build_index_for_project
from story_graph import UserStoryMap, STORY_MAP_PROMPT_TEMPLATE, generate_mermaid_chart
from memory_service import (
    ConversationMemory,
    ProjectMemory,
    get_project_memory,
    build_memory_context,
    save_memory_after_response,
    MEMORY_WINDOW_SIZE,
    MEMORY_TOP_K,
)

try:
    import hdbscan
    from sentence_transformers import SentenceTransformer
    from sklearn.metrics.pairwise import cosine_similarity

    CONFLICT_DETECTION_AVAILABLE = True
except Exception:
    hdbscan = None
    SentenceTransformer = None
    cosine_similarity = None
    CONFLICT_DETECTION_AVAILABLE = False

load_dotenv()

from model_manager import get_model_manager

# Initialize Model Manager
model_manager = get_model_manager()

DEFAULT_MODEL_ID = "llama-3.3-70b-versatile" # Groq Default
DEFAULT_PROVIDER = "groq"

app = FastAPI(
    title="AI Requirements Generation Service",
    description="LLM-powered requirement extraction and generation using Groq",
    version="1.0.0",
)

# CORS configuration for Laravel
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8001", "http://localhost:3000", "http://localhost:5173"],  # Laravel, React, Vite dev
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

# Initialize LangChain ChatGroq models
chat_model_default = ChatGroq(
    groq_api_key=GROQ_API_KEY,
    model_name=DEFAULT_MODEL_ID,
    temperature=0.7
)
chat_model_low_temp = ChatGroq(
    groq_api_key=GROQ_API_KEY,
    model_name=DEFAULT_MODEL_ID,
    temperature=0.3
)

# Gemini model for conflict detection (when Groq is unavailable)
gemini_api_key = os.getenv("GEMINI_API_KEY")
if gemini_api_key and GEMINI_AVAILABLE:
    try:
        chat_model_gemini = ChatGoogleGenerativeAI(
            google_api_key=gemini_api_key,
            model="gemini-2.0-flash",
            temperature=0.3,
            convert_system_message_to_human=True
        )
        print("✅ Gemini model initialized for conflict detection")
    except Exception as e:
        print(f"⚠️ Failed to initialize Gemini: {e}")
        chat_model_gemini = None
else:
    chat_model_gemini = None
    if not gemini_api_key:
        print("⚠️ GEMINI_API_KEY not set, conflict detection will use Groq")
    elif not GEMINI_AVAILABLE:
        print("⚠️ Gemini package not available")

# API Key Authentication
LLM_API_KEY = os.getenv("LLM_API_KEY", "")  # Must be set via env in production.
if not LLM_API_KEY:
    print(
        "WARNING: LLM_API_KEY is not set. "
        "API endpoints protected by X-API-Key will reject all requests."
    )
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

# Internal state for RAG and conflict detection
_rag_manager = None
_rag_index = None
_rag_chunks = None
_rag_available = False
_embedding_model_cache = None

# ---------------------------------------------------------------------------
# Performance optimizations
# ---------------------------------------------------------------------------

# --- LRU cache for RAG query results (keyed by project_id + query hash + top_k) ---
import hashlib
import time as _time

_RAG_CACHE_SIZE = int(os.getenv("RAG_CACHE_SIZE", "100"))
_rag_result_cache: Dict[str, Tuple[List[Dict[str, Any]], List[float], float]] = {}
_rag_cache_lock = threading.Lock()


def _rag_cache_key(project_id: Optional[str], query: str, top_k: int) -> str:
    """Stable cache key: project_id:md5(query):top_k."""
    qhash = hashlib.md5(query.encode()).hexdigest()
    return f"{project_id or 'global'}:{qhash}:{top_k}"


def _rag_cache_get(key: str) -> Optional[Tuple[List[Dict[str, Any]], List[float]]]:
    with _rag_cache_lock:
        entry = _rag_result_cache.get(key)
        if entry is None:
            return None
        results, scores, _ = entry
        return results, scores


def _rag_cache_set(key: str, results: List[Dict[str, Any]], scores: List[float]) -> None:
    with _rag_cache_lock:
        if len(_rag_result_cache) >= _RAG_CACHE_SIZE:
            oldest_key = min(_rag_result_cache, key=lambda k: _rag_result_cache[k][2])
            del _rag_result_cache[oldest_key]
        _rag_result_cache[key] = (results, scores, _time.time())


# ==================== REQUEST/RESPONSE MODELS ====================


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    # Avoid mutable default; normalize to an empty list in the endpoint
    conversation_history: Optional[List[ChatMessage]] = None
    context: Optional[str] = None
    persona_id: Optional[int] = None
    persona_data: Optional[Dict[str, Any]] = None
    project_id: Optional[str] = None  # Add support for project-specific context
    model_id: Optional[str] = None
    provider: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    tokens_used: int
    model: str
    fallback_used: bool = False


class ExtractionRequest(BaseModel):
    text: str = Field(..., min_length=1)
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
    project_id: Optional[int] = None
    min_cluster_size: Optional[int] = 2
    max_batch_size: Optional[int] = 30
    similarity_threshold: Optional[float] = 0.95


class Conflict(BaseModel):
    requirement_id_1: int
    requirement_id_2: int
    conflict_description: str
    severity: str
    req_text_1: Optional[str] = None
    req_text_2: Optional[str] = None
    confidence: Optional[str] = "medium"
    cluster_id: Optional[int] = None


class ConflictDetectionResponse(BaseModel):
    conflicts: List[Conflict]
    total_conflicts: int
    total_requirements: Optional[int] = None
    clusters_found: Optional[int] = None
    method: Optional[str] = "semantic_clustering"


class ConflictResolutionRequest(BaseModel):
    requirement_id_1: int
    requirement_id_2: int
    req_text_1: str
    req_text_2: str
    conflict_description: str
    confidence: str = "medium"


class ConflictResolutionResponse(BaseModel):
    resolution_notes: str
    suggested_action: str


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
    skipped_chunks: Optional[int] = 0
    new_version: Optional[int] = None


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


class CheckToolRequest(BaseModel):
    model_id: str
    provider: str


# ==================== MEMORY API MODELS ====================


class AddMemoryRequest(BaseModel):
    project_id: int
    text: str
    memory_type: Optional[str] = "conversation"  # conversation | entity | decision


class AddMemoryResponse(BaseModel):
    project_id: int
    success: bool
    message: str


class MemoryEntry(BaseModel):
    content: str
    metadata: Dict[str, Any] = {}
    relevance_score: Optional[float] = None


class GetMemoryResponse(BaseModel):
    project_id: int
    total_memories: int
    memories: List[MemoryEntry]


class ClearMemoryResponse(BaseModel):
    project_id: int
    success: bool
    message: str



# ==================== PROMPT TEMPLATES ====================

EXTRACTION_PROMPT = """You are Fishy, an expert business analyst. Extract software requirements from the following text.

Text:
{text}

Instructions:
1. Extract clear, specific requirements
2. Classify each as: functional, non-functional
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
Be helpful, clear, concise, and technical when needed. Always provide actionable advice."""

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

CONFLICT_RESOLUTION_PROMPT = """You are Fishy, an expert at resolving requirement conflicts. Analyze the following conflict and provide a resolution.

Conflict Details:
- Requirement 1 (ID {req_id_1}): {req_text_1}
- Requirement 2 (ID {req_id_2}): {req_text_2}
- Conflict Description: {conflict_description}
- Confidence Level: {confidence}

Instructions:
1. Analyze the root cause of the conflict
2. Propose a practical resolution that addresses both requirements
3. Suggest specific actions to resolve the conflict
4. Consider if one requirement should take precedence, or if both can be reconciled
5. Provide clear, actionable resolution notes

Return format (MUST be valid JSON):
{{
  "resolution_notes": "Detailed explanation of how to resolve this conflict...",
  "suggested_action": "Brief action item (e.g., 'Modify requirement 1 to allow batch processing', 'Prioritize requirement 2', 'Combine both requirements')"
}}"""

# ==================== HELPER FUNCTIONS ====================


async def verify_api_key(api_key: str = Depends(api_key_header)):
    """Verify API key for protected endpoints."""
    if api_key != LLM_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")
    return api_key


def call_llm_chat(
    messages: List[Dict],
    model_id: str = DEFAULT_MODEL_ID,
    provider: str = DEFAULT_PROVIDER,
    max_tokens: int = 1000,
    temperature: float = 0.7
) -> tuple:
    """Call LLM via ModelManager and return response + token usage + model used"""

    # Helper function to parse API errors
    def parse_api_error(exc: Exception) -> dict:
        error_info = {
            "type": "unknown",
            "message": str(exc),
            "status_code": 500
        }

        exc_str = str(exc).lower()

        # Model not found / invalid model
        if "404" in str(exc) or "model_not_found" in exc_str or "does not exist" in exc_str or "not found" in exc_str:
            error_info["type"] = "model_not_found"
            error_info["message"] = f"Model '{model_id}' not found or not accessible"
            error_info["status_code"] = 400

        # Rate limit
        elif "rate_limit" in exc_str or "rate limit" in exc_str or "429" in str(exc):
            error_info["type"] = "rate_limit"
            error_info["message"] = "Rate limit exceeded. Please wait and try again."
            error_info["status_code"] = 429

        # Authentication error
        elif "401" in str(exc) or "authentication" in exc_str or "api key" in exc_str or "unauthorized" in exc_str:
            error_info["type"] = "authentication"
            error_info["message"] = "API authentication failed. Check your API key."
            error_info["status_code"] = 401

        # Invalid request
        elif "400" in str(exc) or "invalid_request" in exc_str or "bad request" in exc_str:
            error_info["type"] = "invalid_request"
            error_info["message"] = f"Invalid request: {exc}"
            error_info["status_code"] = 400

        # Timeout
        elif "timeout" in exc_str or "timed out" in exc_str:
            error_info["type"] = "timeout"
            error_info["message"] = "Request timed out. Please try again."
            error_info["status_code"] = 408

        return error_info

    # Helper function to get model
    def get_model(p: str, m_id: str):
        return model_manager.get_chat_model(p, m_id, temperature)

    # Helper function to convert messages
    def convert_messages(msgs: List[Dict]):
        lc_msgs = []
        for msg in msgs:
            if msg["role"] == "system":
                lc_msgs.append(SystemMessage(content=msg["content"]))
            elif msg["role"] == "user":
                lc_msgs.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                lc_msgs.append(AIMessage(content=msg["content"]))
        return lc_msgs

    # Try primary model
    try:
        model = get_model(provider, model_id)
        langchain_messages = convert_messages(messages)
        response = model.invoke(langchain_messages)
    except Exception as primary_exc:
        # Log the error with full details
        print(f"❌ LLM call failed with {provider}/{model_id}: {primary_exc}")

        error_info = parse_api_error(primary_exc)
        print(f"   Error type: {error_info['type']}, status: {error_info['status_code']}")

        # Try fallback if not already using default
        fallback_used = False
        if provider != DEFAULT_PROVIDER or model_id != DEFAULT_MODEL_ID:
            print(f"🔄 Attempting fallback to {DEFAULT_PROVIDER}/{DEFAULT_MODEL_ID}...")
            try:
                fallback_model = model_manager.get_chat_model(DEFAULT_PROVIDER, DEFAULT_MODEL_ID, temperature)
                fallback_messages = convert_messages(messages)
                response = fallback_model.invoke(fallback_messages)
                print(f"✅ Fallback successful! Using {DEFAULT_MODEL_ID}")
                tokens_used = response.additional_kwargs.get('usage', {}).get('total_tokens', 0)
                fallback_used = True
                return response.content, tokens_used, DEFAULT_MODEL_ID, fallback_used
            except Exception as fallback_exc:
                print(f"❌ Fallback also failed: {fallback_exc}")
                fallback_error = parse_api_error(fallback_exc)

                # If primary error was model not found, include that info
                error_msg = f"Primary model '{model_id}' failed: {error_info['message']}. Fallback also failed: {fallback_error['message']}"

                raise HTTPException(
                    status_code=error_info['status_code'],
                    detail=error_msg
                ) from primary_exc
        else:
            # Already using default model, raise the error
            raise HTTPException(
                status_code=error_info['status_code'],
                detail=error_info['message']
            ) from primary_exc

    content = response.content
    usage = response.additional_kwargs.get('usage', {})
    tokens_used = usage.get('total_tokens', 0)
    # Return model used (either original or fallback)
    model_used = model_id if provider == DEFAULT_PROVIDER else f"{provider}/{model_id}"
    fallback_used = False

    return content, tokens_used, model_used, fallback_used


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
        try:
            avail, index, chunks = _load_rag_artifacts()
        except Exception as exc:
            print(f"RAG artifact load error: {exc}")
            return False

        if not avail or _rag_manager is None:
            return False
        try:
            results = _rag_manager.query(user_query, index, chunks, top_k=1)
            if results:
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
        meta = item.get('meta', {})
        # Handle nested metadata: meta may contain 'original_row' from CSV-based chunks
        # or direct fields from KB-built chunks
        if isinstance(meta, dict) and 'original_row' in meta and isinstance(meta['original_row'], dict):
            # CSV-based chunks store metadata nested under 'original_row'
            flat_meta = meta['original_row']
        else:
            flat_meta = meta if isinstance(meta, dict) else {}

        line = f"{i}. {item.get('text', '')}"

        # Surface stored metadata so LLM uses real values instead of hallucinating
        meta_parts = []
        req_num = flat_meta.get('requirement_number')
        if req_num is not None:
            meta_parts.append(f"Requirement #: {req_num}")
        req_id = flat_meta.get('requirement_id')
        if req_id is not None:
            meta_parts.append(f"DB ID: {req_id}")
        conf = flat_meta.get('confidence_score')
        if conf is not None:
            meta_parts.append(f"Confidence: {conf}")
        req_type = flat_meta.get('requirement_type')
        if req_type:
            meta_parts.append(f"Type: {req_type}")
        priority = flat_meta.get('priority')
        if priority:
            meta_parts.append(f"Priority: {priority}")
        meta_parts.append(f"Similarity: {item.get('score', 0.0):.4f}")

        if meta_parts:
            line += f" [{', '.join(meta_parts)}]"
        lines.append(line)

    lines.append("\nIMPORTANT: Use the metadata values shown above (Confidence, Priority, Type, Requirement #) exactly as provided. Do NOT invent or estimate these values.")
    lines.append("If the context does not contain the answer, say so explicitly.")
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


def _get_rag_manager():
    """Get or create a RagManager instance."""
    if RagManager is None:
        raise HTTPException(
            status_code=500,
            detail="RAG dependencies not installed. Install sentence-transformers and faiss-cpu.",
        )
    return RagManager(model_name=KB_MODEL)


def _get_project_paths_with_fallback(rag, project_id: str) -> Tuple[str, str]:
    """Use rag.get_project_paths when available, otherwise derive paths manually."""
    if hasattr(rag, "get_project_paths"):
        paths = rag.get_project_paths(KB_BASE_DIR, project_id)
        if isinstance(paths, (tuple, list)) and len(paths) >= 2:
            return paths[0], paths[1]

    project_dir = os.path.join(KB_BASE_DIR, str(project_id))
    return (
        os.path.join(project_dir, "faiss_index.bin"),
        os.path.join(project_dir, "faiss_meta.pkl"),
    )


# ==================== AGENTIC TOOL-BASED RETRIEVAL ====================

import re as _re
import logging

_agentic_logger = logging.getLogger("agentic_retrieval")

# Tool schemas for Groq native function/tool calling
RETRIEVAL_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "lookup_by_id",
            "description": (
                "Look up a requirement by its number or identifier "
                "(e.g., REQ-5, #3, requirement 42, Requirement #7). "
                "Use when the user references a specific requirement by number or ID."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "identifier": {
                        "type": "string",
                        "description": "The requirement number or ID to search for (just the number, e.g. '5')"
                    }
                },
                "required": ["identifier"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "lookup_by_content",
            "description": (
                "Search requirements by content or topic using semantic similarity. "
                "Use when the user describes what a requirement is about rather than referencing it by number."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query describing the requirement content or topic"
                    }
                },
                "required": ["query"]
            }
        }
    }
]


def _extract_numeric_id(identifier: str) -> Optional[str]:
    """Extract numeric portion from identifiers like 'REQ-5', '#3', 'requirement 42'."""
    if identifier is None:
        return None
    # Try to extract a number from the identifier
    match = _re.search(r'\d+', str(identifier))
    return match.group(0) if match else str(identifier).strip()


def _tool_lookup_by_id(identifier: str, chunks: list) -> list:
    """
    Search chunks metadata for matching requirement number or ID.
    Returns list of matching chunks with metadata.
    """
    numeric_id = _extract_numeric_id(identifier)
    if not numeric_id:
        return []

    results = []
    for chunk in chunks:
        meta = chunk.get('meta', {})
        # Check requirement_number (user-facing display number)
        req_num = meta.get('requirement_number')
        if req_num is not None and str(req_num) == numeric_id:
            results.append({
                'id': chunk.get('id'),
                'text': chunk.get('text', ''),
                'meta': meta,
                'score': 1.0,  # Exact match
                'match_type': 'requirement_number'
            })
            continue

        # Check requirement_id (database PK)
        req_id = meta.get('requirement_id')
        if req_id is not None and str(req_id) == numeric_id:
            results.append({
                'id': chunk.get('id'),
                'text': chunk.get('text', ''),
                'meta': meta,
                'score': 1.0,
                'match_type': 'requirement_id'
            })
            continue

        # Check chunk id
        chunk_id = chunk.get('id')
        if chunk_id is not None and str(chunk_id) == numeric_id:
            results.append({
                'id': chunk_id,
                'text': chunk.get('text', ''),
                'meta': meta,
                'score': 0.9,
                'match_type': 'chunk_id'
            })

    _agentic_logger.info(f"lookup_by_id('{identifier}') -> {len(results)} results")
    return results


def _tool_lookup_by_content(query: str, rag_manager, index, chunks: list, top_k: int = 5) -> list:
    """Wrapper around existing RagManager.query() for semantic search."""
    results = rag_manager.query(query, index, chunks, top_k=top_k)
    _agentic_logger.info(f"lookup_by_content('{query[:50]}...') -> {len(results)} results")
    return results


def _detect_mismatch(id_results: list, content_results: list) -> Optional[str]:
    """
    If both ID-based and content-based lookups were performed, check for mismatches.
    Returns a mismatch warning string if the results don't align, None otherwise.
    """
    if not id_results or not content_results:
        return None

    # Get the requirement text from ID lookup
    id_texts = {r.get('text', '').strip() for r in id_results if r.get('text')}
    # Get top content results
    content_ids = set()
    for r in content_results[:3]:
        meta = r.get('meta', {})
        rid = meta.get('requirement_number') or meta.get('requirement_id') or r.get('id')
        if rid is not None:
            content_ids.add(str(rid))

    # Check if ID-based result appears in top content results
    id_nums = set()
    for r in id_results:
        meta = r.get('meta', {})
        rn = meta.get('requirement_number') or meta.get('requirement_id') or r.get('id')
        if rn is not None:
            id_nums.add(str(rn))

    overlap = id_nums & content_ids
    if not overlap:
        return (
            "⚠️ MISMATCH DETECTED: The requirement found by ID does not appear in the "
            "top semantic search results for the described content. The user may be "
            "referencing the wrong requirement number, or the requirement content "
            "does not match their description."
        )
    return None


async def _agentic_retrieve(
    user_message: str,
    rag_manager,
    index,
    chunks: list,
    top_k: int = 5,
) -> str:
    """
    Use LLM tool-calling to decide retrieval strategy, execute tools, and build context.
    
    Flow:
    1. Send user query + tool schemas to LLM
    2. LLM decides which tool(s) to call
    3. Execute tool(s) and collect results
    4. Detect mismatches when both tools are used
    5. Return formatted context string
    """
    # Ask LLM which tool(s) to call
    planning_messages = [
        SystemMessage(content=(
            "You are a retrieval planning assistant. Given the user's question, "
            "decide which retrieval tool(s) to call. You can call one or both tools. "
            "Call lookup_by_id when the user mentions a requirement number/ID. "
            "Call lookup_by_content when the user asks about a topic or content. "
            "Call both when the user references both an ID and describes content."
        )),
        HumanMessage(content=user_message),
    ]

    try:
        # Use the low-temp model with tool binding for deterministic tool selection
        tool_model = chat_model_low_temp.bind_tools(RETRIEVAL_TOOLS)
        planning_response = tool_model.invoke(planning_messages)
    except Exception as e:
        _agentic_logger.warning(f"Tool calling failed, falling back to content search: {e}")
        # Fallback: just do content-based search
        results = _tool_lookup_by_content(user_message, rag_manager, index, chunks, top_k)
        return _build_rag_context_message(results)

    # Extract tool calls from response
    tool_calls = getattr(planning_response, 'tool_calls', None) or []

    # If no tools were called, the model may have decided RAG isn't needed,
    # or the model doesn't support tool calling — fall back to content search
    if not tool_calls:
        _agentic_logger.info("No tool calls from LLM, falling back to content search")
        results = _tool_lookup_by_content(user_message, rag_manager, index, chunks, top_k)
        return _build_rag_context_message(results)

    # Execute each tool call
    all_results = []
    id_results = []
    content_results = []

    for tc in tool_calls:
        fname = tc.get('name', '') if isinstance(tc, dict) else getattr(tc, 'name', '')
        args = tc.get('args', {}) if isinstance(tc, dict) else getattr(tc, 'args', {})

        if fname == 'lookup_by_id':
            identifier = args.get('identifier', '')
            results = _tool_lookup_by_id(identifier, chunks)
            id_results.extend(results)
            all_results.extend(results)
            print(f"🔍 Tool lookup_by_id('{identifier}') → {len(results)} results")

        elif fname == 'lookup_by_content':
            query = args.get('query', user_message)
            results = _tool_lookup_by_content(query, rag_manager, index, chunks, top_k)
            content_results.extend(results)
            all_results.extend(results)
            print(f"🔍 Tool lookup_by_content('{query[:50]}...') → {len(results)} results")

    # Deduplicate results by chunk text (keep highest score)
    seen_texts = {}
    deduped = []
    for r in all_results:
        text = r.get('text', '')
        if text not in seen_texts or r.get('score', 0) > seen_texts[text].get('score', 0):
            seen_texts[text] = r
    deduped = list(seen_texts.values())
    # Sort by score descending
    deduped.sort(key=lambda x: x.get('score', 0), reverse=True)

    # Check for mismatches
    mismatch_warning = _detect_mismatch(id_results, content_results)

    # Build context message
    context = _build_rag_context_message(deduped[:top_k])

    if mismatch_warning:
        context += f"\n\n{mismatch_warning}"

    return context


async def _detect_conflicts_simple(request: ConflictDetectionRequest) -> ConflictDetectionResponse:
    """
    Simple LLM-only conflict detection (fallback when semantic libraries unavailable).
    """
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

    response_text, tokens_used, _, _ = call_llm_chat(
        messages, max_tokens=2000, temperature=0.3
    )
    parsed_data = parse_json_response(response_text)

    conflicts = []
    for conflict in parsed_data.get("conflicts", []):
        conflicts.append(Conflict(
            requirement_id_1=conflict.get("requirement_id_1"),
            requirement_id_2=conflict.get("requirement_id_2"),
            conflict_description=conflict.get("conflict_description", ""),
            severity=conflict.get("severity", "medium"),
            confidence="medium"
        ))

    return ConflictDetectionResponse(
        conflicts=conflicts,
        total_conflicts=len(conflicts),
        total_requirements=len(request.requirements),
        clusters_found=0,
        method="llm_only"
    )


async def _detect_conflicts_semantic(request: ConflictDetectionRequest) -> ConflictDetectionResponse:
    """
    Advanced semantic clustering + LLM verification conflict detection.
    
    Process:
    1. Generate embeddings for all requirements
    2. Cluster similar requirements using HDBSCAN
    3. Remove near-duplicates within clusters
    4. Check each cluster for conflicts using LLM
    """
    global _embedding_model_cache
    
    # Extract requirements data
    req_ids = [str(req.get('id', f'REQ_{i}')) for i, req in enumerate(request.requirements)]
    req_numbers = [str(req.get('number', req.get('id', f'{i+1}'))) for i, req in enumerate(request.requirements)]
    req_texts = [req.get('text', '') for req in request.requirements]
    
    # Step 1: Generate embeddings (with model caching)
    print(f"🧮 Generating embeddings for {len(req_texts)} requirements...")
    if _embedding_model_cache is None:
        _embedding_model_cache = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    embeddings = _embedding_model_cache.encode(req_texts, normalize_embeddings=True)
    
    # Step 2: Cluster requirements
    print(f"🔍 Clustering requirements...")
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=request.min_cluster_size,
        min_samples=1,
        metric='euclidean',
        cluster_selection_method='eom',
        allow_single_cluster=False
    )
    cluster_labels = clusterer.fit_predict(embeddings)
    
    n_clusters = len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0)
    n_noise = list(cluster_labels).count(-1)
    
    print(f"✅ Found {n_clusters} clusters ({n_noise} outliers)")
    
    # Step 3: Detect conflicts within each cluster
    all_conflicts = []
    
    for cluster_id in set(cluster_labels):
        if cluster_id == -1:  # Skip noise/outliers
            continue
            
        # Get requirements in this cluster
        cluster_indices = [i for i, label in enumerate(cluster_labels) if label == cluster_id]
        
        if len(cluster_indices) < 2:
            continue
        
        # Remove near-duplicates
        cluster_indices = _remove_near_duplicates(
            cluster_indices, 
            embeddings, 
            request.similarity_threshold
        )
        
        if len(cluster_indices) < 2:
            continue
        
        # Get requirements for this cluster
        cluster_requirements = [
            (req_ids[i], req_numbers[i], req_texts[i]) for i in cluster_indices
        ]
        
        # Split into batches if needed
        max_batch = request.max_batch_size
        if len(cluster_requirements) <= max_batch:
            conflicts = await _check_conflicts_in_batch(
                cluster_requirements,
                cluster_id
            )
            all_conflicts.extend(conflicts)
        else:
            # Process in batches
            for batch_start in range(0, len(cluster_requirements), max_batch):
                batch = cluster_requirements[batch_start:batch_start + max_batch]
                conflicts = await _check_conflicts_in_batch(batch, cluster_id)
                all_conflicts.extend(conflicts)
    
    print(f"✅ Found {len(all_conflicts)} conflicts")
    
    return ConflictDetectionResponse(
        conflicts=all_conflicts,
        total_conflicts=len(all_conflicts),
        total_requirements=len(request.requirements),
        clusters_found=n_clusters,
        method="semantic_clustering"
    )


def _remove_near_duplicates(
    indices: List[int], 
    embeddings, 
    threshold: float = 0.95
) -> List[int]:
    """Remove near-duplicate requirements from a cluster."""
    if len(indices) <= 1:
        return indices
    
    cluster_embeddings = embeddings[indices]
    sim_matrix = cosine_similarity(cluster_embeddings)
    
    # Keep first occurrence, remove duplicates
    to_keep = set(range(len(indices)))
    for i in range(len(indices)):
        if i not in to_keep:
            continue
        for j in range(i + 1, len(indices)):
            if j in to_keep and sim_matrix[i, j] > threshold:
                to_keep.discard(j)
    
    kept_indices = [indices[i] for i in sorted(to_keep)]
    removed = len(indices) - len(kept_indices)
    if removed > 0:
        print(f"   📝 Removed {removed} near-duplicate(s) from cluster")
    
    return kept_indices


async def _check_conflicts_in_batch(
    requirements: List[Tuple[str, str, str]], 
    cluster_id: int
) -> List[Conflict]:
    """
    Use LLM to check for conflicts in a batch of requirements.
    
    Args:
        requirements: List of (req_id, req_number, req_text) tuples
        cluster_id: Cluster ID for tracking
        
    Returns:
        List of detected conflicts
    """
    if len(requirements) < 2:
        return []
    
    # Build structured prompt using requirement numbers for display
    req_list = "\n".join([
        f"{i+1}. [Requirement {req_number}] {text}"
        for i, (req_id, req_number, text) in enumerate(requirements)
    ])
    
    prompt = f"""You are analyzing requirements for logical conflicts.

Requirements to analyze:
{req_list}

Task: Identify any pairs of requirements that CANNOT both be true or would create a logical contradiction.

Return your analysis as a JSON array. For each conflict found, include:
- req_a: Requirement number of first requirement (e.g., "10", "11")
- req_b: Requirement number of second requirement
- reason: Brief explanation of the conflict (use "Requirement X" format when referring to requirements)
- confidence: "high", "medium", or "low"
- severity: "high", "medium", or "low"

If no conflicts exist, return an empty array: []

Response format:
[
  {{"req_a": "10", "req_b": "11", "reason": "Requirement 10 mandates X while Requirement 11 forbids X", "confidence": "high", "severity": "high"}},
  ...
]

JSON output only:"""

    # Try Groq first, fallback to Gemini if Groq fails
    response_text = None
    try:
        response = chat_model_low_temp.invoke([HumanMessage(content=prompt)])
        response_text = response.content

        # Extract JSON from markdown code blocks if present
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()

        # Parse JSON response
        conflicts_data = json.loads(response_text)

        if not isinstance(conflicts_data, list):
            print(f"⚠️ Expected list of conflicts, got {type(conflicts_data)}")
            return []

    except Exception as e:
        print(f"⚠️ Error in conflict detection: {str(e)}")
        if response_text:
            print(f"   Response preview: {response_text[:200]}...")
        # Try Gemini as fallback
        if chat_model_gemini:
            try:
                print(f"   Trying Gemini as fallback...")
                response = chat_model_gemini.invoke([HumanMessage(content=prompt)])
                response_text = response.content

                # Extract JSON from markdown code blocks if present
                if "```json" in response_text:
                    response_text = response_text.split("```json")[1].split("```")[0].strip()
                elif "```" in response_text:
                    response_text = response_text.split("```")[1].split("```")[0].strip()

                conflicts_data = json.loads(response_text)
                if not isinstance(conflicts_data, list):
                    print(f"⚠️ Expected list of conflicts, got {type(conflicts_data)}")
                    return []
            except Exception as gemini_error:
                print(f"❌ Gemini fallback also failed: {gemini_error}")
                return []
        else:
            return []

    # Create Conflict objects
    # Create maps: number -> (id, text)
    req_number_to_id = {req_number: req_id for req_id, req_number, text in requirements}
    req_id_to_text = {req_id: text for req_id, req_number, text in requirements}
    conflicts = []

    for conflict in conflicts_data:
        req_a_num = str(conflict.get("req_a", ""))
        req_b_num = str(conflict.get("req_b", ""))

        # Map requirement numbers back to database IDs
        req_a_id = req_number_to_id.get(req_a_num, req_a_num)
        req_b_id = req_number_to_id.get(req_b_num, req_b_num)

        # Convert ID to integer (handle both numeric and string IDs)
        id_a = int(req_a_id) if str(req_a_id).isdigit() else abs(hash(req_a_id)) % 100000
        id_b = int(req_b_id) if str(req_b_id).isdigit() else abs(hash(req_b_id)) % 100000

        conflicts.append(Conflict(
            requirement_id_1=id_a,
            requirement_id_2=id_b,
            conflict_description=conflict.get("reason", "No reason provided"),
            severity=conflict.get("severity", "medium"),
            req_text_1=req_id_to_text.get(req_a_id, ""),
            req_text_2=req_id_to_text.get(req_b_id, ""),
            confidence=conflict.get("confidence", "medium"),
            cluster_id=cluster_id
        ))

    return conflicts


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
        "model": DEFAULT_MODEL_ID,
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "model": DEFAULT_MODEL_ID,
    }


@app.get("/models")
async def list_models(api_key: str = Depends(verify_api_key)):
    """List available models from configured providers."""
    return model_manager.get_available_models()

@app.post("/models/check-tools")
async def check_tool_capability_endpoint(request: CheckToolRequest, api_key: str = Depends(verify_api_key)):
    """Check if a specific model supports tool calling."""
    supports = model_manager.check_tool_capability(request.provider, request.model_id)
    return {"model_id": request.model_id, "supports_tools": supports}

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
        "context": "Optional context about the project",
        "model_id": "llama3-70b-8192",
        "provider": "groq"
    }
    """
    try:
        # Determine model to use
        model_id = request.model_id or DEFAULT_MODEL_ID
        provider = request.provider or DEFAULT_PROVIDER
        # Build system prompt with persona if provided
        system_prompt = CHAT_SYSTEM_PROMPT
        
        # Apply persona context if provided
        if request.persona_data and isinstance(request.persona_data, dict):
            persona_name = request.persona_data.get('name', 'Unknown')
            persona_role = request.persona_data.get('role', '')
            persona_description = request.persona_data.get('description', '')
            persona_priorities = request.persona_data.get('priorities', [])
            persona_concerns = request.persona_data.get('concerns', [])
            persona_comm_style = request.persona_data.get('communication_style', '')
            persona_tech_level = request.persona_data.get('technical_level', '')
            persona_focus_areas = request.persona_data.get('focus_areas', [])
            
            # Build enhanced system prompt with persona details
            persona_context = f"\n\nYou are now responding as '{persona_name}'"
            if persona_role:
                persona_context += f", a {persona_role}"
            persona_context += "."
            
            if persona_description:
                persona_context += f"\n\nPersona Description: {persona_description}"
            
            if persona_priorities:
                persona_context += f"\n\nYour Priorities: {', '.join(persona_priorities) if isinstance(persona_priorities, list) else persona_priorities}"
            
            if persona_concerns:
                persona_context += f"\n\nYour Key Concerns: {', '.join(persona_concerns) if isinstance(persona_concerns, list) else persona_concerns}"
            
            if persona_focus_areas:
                persona_context += f"\n\nYour Focus Areas: {', '.join(persona_focus_areas) if isinstance(persona_focus_areas, list) else persona_focus_areas}"
            
            if persona_tech_level:
                persona_context += f"\n\nTechnical Level: {persona_tech_level}"
            
            if persona_comm_style:
                persona_context += f"\n\nCommunication Style: {persona_comm_style}"
            
            persona_context += "\n\nRespond to all messages from this persona's perspective, focusing on their priorities, concerns, and expertise level."
            
            system_prompt += persona_context
            
            # Log persona usage
            print(f"🎭 Using persona: {persona_name} (ID: {request.persona_id})")
            print(f"   Role: {persona_role}")
            print(f"   Tech Level: {persona_tech_level}")

        # ---- Dual-mode memory: inject relevant context ----
        # Detect mode: project_id provided → project mode, otherwise → normal mode
        is_project_mode = bool(request.project_id)

        if is_project_mode:
            print(f"🧠 Project mode active for project_id={request.project_id}")
        else:
            print(f"🧠 Normal chat mode (window={MEMORY_WINDOW_SIZE})")

        memory_context_str, conversation_memory, project_memory = build_memory_context(
            message=request.message,
            conversation_history=request.conversation_history or [],
            project_id=request.project_id,
            model_manager=model_manager,
        )

        messages = [{"role": "system", "content": system_prompt}]

        # Prepend memory context (from either normal or project mode)
        if memory_context_str:
            messages.append({"role": "system", "content": memory_context_str})

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
        rag_system_msg = None

        # ── Performance: skip expensive RAG for very short / non-informative queries ──
        _q = request.message.strip().lower()
        _RAG_SIGNAL_KW = {
            "requirement", "requirements", "document", "feature", "spec",
            "analyze", "compare", "conflict", "summarize", "extract",
            "kb", "knowledge", "user story", "epic", "stakeholder",
            "use case", "frs", "srs",
        }
        _skip_rag = (
            len(_q) < 20
            and not any(kw in _q for kw in _RAG_SIGNAL_KW)
        )

        try:
            # 1. Project-Specific RAG (Agentic Tool-Based Retrieval)
            if request.project_id and not _skip_rag:
                try:
                    print(f"🔍 Attempting agentic project RAG for project_id={request.project_id}")
                    rag_manager = _get_rag_manager()
                    p_index, p_meta = _get_project_paths_with_fallback(rag_manager, request.project_id)

                    if os.path.exists(p_index) and os.path.exists(p_meta):
                        # Use TTL-cached FAISS loader (avoids disk I/O on every call)
                        p_index_obj, p_chunks = get_faiss_index(
                            request.project_id, p_index, p_meta
                        )

                        # Try RAG result cache first
                        cache_key = _rag_cache_key(request.project_id, request.message, RAG_TOP_K)
                        cached = _rag_cache_get(cache_key)
                        if cached is not None:
                            cached_results, cached_scores = cached
                            print(f"📦 RAG cache hit for project {request.project_id}")
                            rag_system_msg = _build_rag_context_message(cached_results)
                        else:
                            # Use agentic retrieval: LLM decides which tool(s) to call
                            rag_system_msg = await _agentic_retrieve(
                                request.message, rag_manager, p_index_obj, p_chunks, top_k=RAG_TOP_K
                            )
                            # NOTE: agentic retrieval returns a formatted string directly,
                            # not structured result lists — skip caching it since we cannot
                            # reconstruct the original results from the string alone.

                        if rag_system_msg:
                            print(f"✅ Agentic retrieval completed for project {request.project_id}")
                    else:
                        print(f"⚠️ No RAG index found for project {request.project_id}")

                except Exception as e:
                    print(f"❌ Project RAG error: {e}")
                    import traceback
                    traceback.print_exc()
            
            # 2. Global RAG Fallback (only if no project context or project RAG yielded nothing?)
            # Valid strategy: If user provided project_id, they likely want project context. 
            # If we failed to get project context, maybe we shouldn't fallback to global to avoid confusion?
            # BUT, let's keep existing behavior for non-project requests.
            if not rag_system_msg and not request.project_id and not _skip_rag:
                use_rag = needs_rag(request.message, use_model=True)
                if use_rag:
                    cache_key = _rag_cache_key(None, request.message, RAG_TOP_K)
                    cached = _rag_cache_get(cache_key)
                    if cached is not None:
                        cached_results, cached_scores = cached
                        rag_system_msg = _build_rag_context_message(cached_results)
                        print("📦 Global RAG cache hit")
                    else:
                        avail, index, chunks = _load_rag_artifacts()
                        if avail and _rag_manager is not None:
                            retrieved = _rag_manager.query(
                                request.message, index, chunks, top_k=RAG_TOP_K
                            )
                            rag_system_msg = _build_rag_context_message(retrieved)
                            # Cache structured results for future identical queries
                            _rag_cache_set(
                                cache_key,
                                retrieved,
                                [r.get("score", 0.0) for r in retrieved],
                            )

            # Insert RAG context if we have it
            if rag_system_msg:
                messages.insert(1, {"role": "system", "content": rag_system_msg})
                
        except Exception as e:
            print(f"Global RAG logic error: {e}")
            # Continue without RAG

        # Call LLM
        response_text, tokens_used, model_used, fallback_used = call_llm_chat(
            messages,
            model_id=request.model_id or DEFAULT_MODEL_ID,
            provider=request.provider or DEFAULT_PROVIDER,
            max_tokens=2000,
            temperature=0.7
        )

        # ---- Save exchange to memory (non-blocking; failures must not break chat) ----
        try:
            save_memory_after_response(
                user_message=request.message,
                ai_response=response_text,
                conversation_memory=conversation_memory,
                project_memory=project_memory,
                model_manager=model_manager,
            )
            print(f"💾 Memory saved ({'project' if project_memory else 'session'} mode)")
        except Exception as mem_err:
            print(f"⚠️ Memory save failed (non-critical): {mem_err}")

        return ChatResponse(
            response=response_text,
            tokens_used=tokens_used,
            model=model_used,
            fallback_used=fallback_used
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== MEMORY MANAGEMENT ENDPOINTS ====================


@app.post("/api/memory/summarize", response_model=AddMemoryResponse)
async def add_memory(request: AddMemoryRequest):
    """
    Manually add a memory entry for a project.
    Use when: user explicitly says 'remember this' or AI extracts a key fact.

    Usage:
    POST /api/memory/summarize
    {
        "project_id": 42,
        "text": "The project uses JWT for authentication",
        "memory_type": "entity"
    }
    """
    try:
        project_memory = get_project_memory(request.project_id)
        success = project_memory.add_manual_memory(
            text=request.text,
            memory_type=request.memory_type or "conversation"
        )
        if success:
            return AddMemoryResponse(
                project_id=request.project_id,
                success=True,
                message=f"Memory added ({request.memory_type})"
            )
        else:
            return AddMemoryResponse(
                project_id=request.project_id,
                success=False,
                message="Failed to add memory"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/memory/{project_id}", response_model=GetMemoryResponse)
async def get_project_memories(project_id: int):
    """
    Retrieve all stored memories for a project.
    Use for: debugging, frontend memory display.

    Usage:
    GET /api/memory/42
    """
    try:
        project_memory = get_project_memory(project_id)
        memories = project_memory.get_all_memories()
        return GetMemoryResponse(
            project_id=project_id,
            total_memories=len(memories),
            memories=[
                MemoryEntry(
                    content=m["content"],
                    metadata=m.get("metadata", {}),
                    relevance_score=None
                )
                for m in memories
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/memory/{project_id}", response_model=ClearMemoryResponse)
async def clear_project_memory(project_id: int):
    """
    Delete all memories for a project.
    Use when: user wants to reset project memory.

    Usage:
    DELETE /api/memory/42
    """
    try:
        project_memory = get_project_memory(project_id)
        success = project_memory.clear()
        if success:
            return ClearMemoryResponse(
                project_id=project_id,
                success=True,
                message=f"All memories cleared for project {project_id}"
            )
        else:
            return ClearMemoryResponse(
                project_id=project_id,
                success=False,
                message="Failed to clear memories"
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
                "content": "You are Fishy, a requirements extraction expert. Always return valid JSON.",
            },
            {"role": "user", "content": prompt},
        ]

        # Use lower temperature for more consistent JSON output
        response_text, tokens_used, _, _ = call_llm_chat(
            messages, max_tokens=3000, temperature=0.3
        )
        parsed_data = parse_json_response(response_text)

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

        response_text, tokens_used, _, _ = call_llm_chat(
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
    Detect conflicts between requirements using semantic clustering + LLM verification.
    
    This endpoint uses a two-stage approach:
    1. Semantic clustering to group similar requirements
    2. LLM-based conflict verification within clusters

    Usage:
    POST /api/conflicts/detect
    {
        "requirements": [
            {"id": 1, "text": "Must work offline"},
            {"id": 2, "text": "Requires real-time cloud sync"}
        ],
        "min_cluster_size": 2,
        "max_batch_size": 30,
        "similarity_threshold": 0.95
    }
    """
    try:
        if not request.requirements or len(request.requirements) < 2:
            return ConflictDetectionResponse(
                conflicts=[],
                total_conflicts=0,
                total_requirements=len(request.requirements or []),
                clusters_found=0,
                method="none_required"
            )
        
        # Check if advanced conflict detection is available
        if not CONFLICT_DETECTION_AVAILABLE:
            print("ℹ️ Using simple LLM-only conflict detection (semantic libraries unavailable)")
            return await _detect_conflicts_simple(request)
        
        # Use semantic clustering approach
        print(f"🔍 Starting semantic conflict detection for {len(request.requirements)} requirements")
        return await _detect_conflicts_semantic(request)
        
    except Exception as e:
        print(f"❌ Conflict detection error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Conflict detection failed: {str(e)}")


@app.post("/api/conflicts/resolve", response_model=ConflictResolutionResponse)
async def resolve_conflict(request: ConflictResolutionRequest):
    """
    Generate automatic resolution for a conflict between requirements

    Usage:
    POST /api/conflicts/resolve
    {
        "requirement_id_1": 1,
        "requirement_id_2": 2,
        "req_text_1": "Must work offline",
        "req_text_2": "Requires real-time cloud sync",
        "conflict_description": "Offline mode conflicts with real-time sync",
        "confidence": "high"
    }
    """
    try:
        prompt = CONFLICT_RESOLUTION_PROMPT.format(
            req_id_1=request.requirement_id_1,
            req_id_2=request.requirement_id_2,
            req_text_1=request.req_text_1,
            req_text_2=request.req_text_2,
            conflict_description=request.conflict_description,
            confidence=request.confidence
        )

        messages = [
            {
                "role": "system",
                "content": "You are Fishy, an expert at resolving requirement conflicts. Always return valid JSON.",
            },
            {"role": "user", "content": prompt},
        ]

        response_text, tokens_used, _, _ = call_llm_chat(
            messages, max_tokens=1500, temperature=0.4
        )
        parsed_data = parse_json_response(response_text)

        return ConflictResolutionResponse(
            resolution_notes=parsed_data.get("resolution_notes", "No resolution provided"),
            suggested_action=parsed_data.get("suggested_action", "Review conflict manually")
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

        response_text, tokens_used, _, _ = call_llm_chat(
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
    except HTTPException as exc:
        raise exc
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
        index_path, meta_path = _get_project_paths_with_fallback(rag, request.project_id)

        # Check if index exists
        if not os.path.exists(index_path):
            raise HTTPException(
                status_code=404,
                detail=f"Knowledge base not found for project {request.project_id}. Use /kb/build first.",
            )

        # Prepare new chunks
        new_chunks = _prepare_document_chunks(request.documents)

        # Incremental add
        result = rag.incremental_add(
            index_path=index_path,
            meta_path=meta_path,
            new_chunks=new_chunks,
            project_id=request.project_id,
        )

        # rag.incremental_add returns (index, updated_chunks, added_count, skipped_count, new_version)
        if isinstance(result, tuple) and len(result) >= 5:
            index, updated_chunks, added_count, skipped_count, new_version = result
        else:
            # Fallback for older implementations
            index, updated_chunks = result
            added_count = len(new_chunks)
            skipped_count = 0
            new_version = None

        return IncrementalKBResponse(
            project_id=request.project_id,
            status="completed",
            message=f"Added {added_count} chunks to project {request.project_id}",
            added_chunks=added_count,
            total_chunks=len(updated_chunks),
            skipped_chunks=skipped_count,
            new_version=new_version,
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
        index_path, meta_path = _get_project_paths_with_fallback(rag, request.project_id)

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
        index_path, meta_path = _get_project_paths_with_fallback(rag, project_id)

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
    """Simple test endpoint to verify LangChain-Groq connection"""
    try:
        model = model_manager.get_chat_model(DEFAULT_PROVIDER, DEFAULT_MODEL_ID)
        response = model.invoke([HumanMessage(content="Say 'Hello, FastAPI with LangChain-Groq!'")])
        content = response.content
        usage = response.additional_kwargs.get('usage', {})
        tokens_used = usage.get('total_tokens', 0)
        return {
            "success": True,
            "response": content,
            "model": DEFAULT_MODEL_ID,
            "tokens_used": tokens_used,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== STORY GRAPH GENERATION ====================


class StoryGraphRequest(BaseModel):
    project_id: int
    project_name: str
    requirements: List[Dict[str, Any]]
    chat_context: Optional[str] = None


class StoryGraphResponse(BaseModel):
    success: bool
    mermaid_code: Optional[str] = None
    story_map: Optional[Dict[str, Any]] = None
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    error: Optional[str] = None


@app.post("/api/story-graph/generate", response_model=StoryGraphResponse)
async def generate_story_graph(request: StoryGraphRequest):
    """
    Generate a user story graph from project requirements using Strict JSON Schema.
    Returns both Mermaid.js code and structured Story Map data.
    """
    try:
        if not request.requirements:
            return StoryGraphResponse(
                success=True,
                mermaid_code="graph TD\n    A[No Requirements] -->|Add requirements to generate graph| B[End]",
            )

        # Prepare requirements text
        req_text = "\n".join([
            f"{i+1}. {req.get('title', 'Untitled')}\n"
            f"   Type: {req.get('type', 'N/A')}\n"
            f"   Priority: {req.get('priority', 'N/A')}\n"
            f"   Description: {req.get('text', '')}\n"
            for i, req in enumerate(request.requirements)
        ])
        
        # Add chat context if available
        if request.chat_context:
            req_text += f"\n\nAdditional Context from Chat:\n{request.chat_context}"
        
        # Prepare Schema
        schema_json = json.dumps(UserStoryMap.model_json_schema(), indent=2)

        # Format Prompt
        prompt_content = STORY_MAP_PROMPT_TEMPLATE.format(
            product_description=req_text,
            json_schema=schema_json
        )

        # Call LLM
        messages = [
            HumanMessage(content=prompt_content)
        ]

        # Use low temp for strict JSON adherence
        # Try Groq first, fallback to Gemini if fails
        try:
            response = chat_model_low_temp.invoke(messages)
        except Exception as groq_error:
            print(f"⚠️ Groq failed in story graph: {groq_error}, trying Gemini...")
            if chat_model_gemini:
                try:
                    response = chat_model_gemini.invoke(messages)
                    print("✅ Gemini fallback successful for story graph")
                except Exception as gemini_error:
                    print(f"❌ Gemini also failed: {gemini_error}")
                    raise Exception(f"Groq failed: {groq_error}. Gemini fallback also failed: {gemini_error}")
            else:
                raise groq_error

        content = response.content.strip()

        # Parse JSON (Handle markdown code blocks)
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
        # Parse and Validate
        try:
            story_map_obj = UserStoryMap.model_validate_json(content)
        except Exception as validation_error:
            print(f"JSON Validation Error: {validation_error} \nContent: {content}")
            raise validation_error
        
        # Generate Mermaid
        mermaid_code = generate_mermaid_chart(story_map_obj)
        
        # Convert Pydantic model to Dict for response
        story_map_dict = story_map_obj.model_dump()
        
        # Determine nodes/edges for backward compatibility or generic graph view if needed
        nodes = []
        edges = []
        
        # Add Activity Nodes
        for act in story_map_obj.activities:
            nodes.append({"id": act.id, "label": act.name, "type": "activity", "group": "activity", "order": act.order})
            
        # Add Task Nodes
        for task in story_map_obj.tasks:
            nodes.append({"id": task.id, "label": task.name, "type": "task", "group": "task", "priority": task.priority, "order": task.order})
            
        # Add Story Nodes
        for story in story_map_obj.userStories:
            nodes.append({"id": story.id, "label": story.text, "type": "story", "group": "story", "priority": story.priority})
            edges.append({"source": story.taskId, "target": story.id, "type": "child"})
            
        # Infer task->activity link from stories
        for task in story_map_obj.tasks:
            related_stories = [s for s in story_map_obj.userStories if s.taskId == task.id]
            if related_stories:
                activity_id = related_stories[0].activityId
                edges.append({"source": activity_id, "target": task.id, "type": "parent"})

        return StoryGraphResponse(
            success=True,
            mermaid_code=mermaid_code,
            story_map=story_map_dict,
            nodes=nodes,
            edges=edges
        )

    except Exception as e:
        print(f"Error generating story graph: {e}")
        return StoryGraphResponse(
            success=False,
            error=str(e),
            mermaid_code=f"graph TD\n Error[\"Error generating graph: {str(e)}\"]"
        )


# ==================== AGENT EXECUTION ENDPOINTS ====================


class AgentExecuteRequest(BaseModel):
    task: str
    project_id: Optional[int] = None
    model: Optional[str] = None
    tools: Optional[List[str]] = None


class AgentToolResult(BaseModel):
    tool: str
    result: Any
    success: bool


@app.post("/api/agent/execute")
async def agent_execute(request: AgentExecuteRequest):
    """
    Execute an agent task with streaming support.

    Usage:
    POST /api/agent/execute
    Headers: X-API-Key: your-api-key
    {
        "task": "Summarize requirements",
        "project_id": 1,
        "model": "groq/mixtral-8x7b-32768",
        "tools": ["rag_query", "extract_requirements"]
    }
    """
    try:
        async def generate():
            task_id = str(uuid.uuid4())[:12]
            model_id = request.model or DEFAULT_MODEL_ID
            provider = "groq"

            # Send status event
            yield f"data: {json.dumps({'type': 'status', 'status': 'starting', 'task_id': task_id})}\n\n"

            # Build system prompt
            system_prompt = (
                "You are an expert requirements analysis agent named Fishy. "
                "Your role is to help analyze, extract, and manage software requirements. "
                "Be thorough, precise, and always respond with valid JSON when structured output is expected."
            )

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.task},
            ]

            # Load project context if project_id provided
            project_context = ""
            if request.project_id:
                yield f"data: {json.dumps({'type': 'status', 'status': 'loading_project', 'project_id': request.project_id})}\n\n"
                try:
                    from build_faiss import build_index_for_project
                    import os as _os
                    p_dir = _os.path.join(KB_BASE_DIR, str(request.project_id))
                    p_index = _os.path.join(p_dir, "index.faiss")
                    p_meta = _os.path.join(p_dir, "meta.pkl")
                    if _os.path.exists(p_index) and _os.path.exists(p_meta):
                        yield f"data: {json.dumps({'type': 'status', 'status': 'using_rag', 'project_id': request.project_id})}\n\n"
                except Exception as e:
                    print(f"Agent project context load error: {e}")

            yield f"data: {json.dumps({'type': 'status', 'status': 'calling_llm'})}\n\n"

            # Stream the LLM response
            response_text, tokens_used, model_used, fallback_used = call_llm_chat(
                messages,
                model_id=model_id,
                provider=provider,
                max_tokens=2000,
                temperature=0.7,
            )

            # Send chunks of the response
            for i in range(0, len(response_text), 20):
                chunk = response_text[i:i + 20]
                yield f"data: {json.dumps({'type': 'message', 'content': chunk})}\n\n"

            # Send final result
            yield f"data: {json.dumps({'type': 'done', 'task_id': task_id, 'tokens_used': tokens_used, 'model': model_used, 'fallback_used': fallback_used})}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/agent/tools")
async def agent_list_tools():
    """Return available tools for agent execution."""
    return {
        "tools": [
            {
                "name": "rag_query",
                "description": "Query the project knowledge base for relevant requirements",
                "parameters": {"type": "object", "properties": {"query": {"type": "string"}}},
            },
            {
                "name": "extract_requirements",
                "description": "Extract structured requirements from natural language text",
                "parameters": {"type": "object", "properties": {"text": {"type": "string"}}},
            },
            {
                "name": "detect_conflicts",
                "description": "Detect conflicts between requirements",
                "parameters": {"type": "object", "properties": {"requirements": {"type": "array"}}},
            },
            {
                "name": "generate_persona",
                "description": "Generate a persona-specific view of a requirement",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "requirement_text": {"type": "string"},
                        "persona_name": {"type": "string"},
                    },
                },
            },
        ]
    }


@app.post("/api/agent/tools/{tool_name}/execute")
async def agent_execute_tool(tool_name: str, params: Dict[str, Any]):
    """Execute a specific tool by name."""
    tool_map = {
        "rag_query": lambda p: _rag_query_tool(p.get("query", "")),
        "extract_requirements": lambda p: _extract_tool(p.get("text", "")),
        "detect_conflicts": lambda p: _detect_conflicts_tool(p.get("requirements", [])),
        "generate_persona": lambda p: _generate_persona_tool(
            p.get("requirement_text", ""), p.get("persona_name", "Developer")
        ),
    }
    if tool_name not in tool_map:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not found")
    try:
        result = tool_map[tool_name](params)
        return {"tool": tool_name, "result": result, "success": True}
    except Exception as e:
        return {"tool": tool_name, "result": None, "success": False, "error": str(e)}


@app.get("/api/agent/history")
async def agent_history(project_id: Optional[int] = None):
    """Return agent execution history (in-memory for now)."""
    return {"executions": [], "note": "History not yet persisted"}


@app.post("/api/agent/tasks/{task_id}/cancel")
async def agent_cancel_task(task_id: str):
    """Cancel an ongoing agent task."""
    return {"task_id": task_id, "status": "cancelled"}


# ---- Agent tool helpers ----

def _rag_query_tool(query: str) -> Any:
    avail, index, chunks = _load_rag_artifacts()
    if not avail or _rag_manager is None:
        return {"error": "RAG not available", "results": []}
    results = _rag_manager.query(query, index, chunks, top_k=5)
    return {"results": results}


def _extract_tool(text: str) -> Any:
    req = ExtractionRequest(text=text)
    resp = ExtractionResponse(
        requirements=[], total_extracted=0, tokens_used=0
    )
    prompt = EXTRACTION_PROMPT.format(text=req.text)
    messages = [
        {
            "role": "system",
            "content": "You are Fishy, a requirements extraction expert. Always return valid JSON.",
        },
        {"role": "user", "content": prompt},
    ]
    response_text, tokens_used, _, _ = call_llm_chat(messages, max_tokens=3000, temperature=0.3)
    parsed_data = parse_json_response(response_text)
    return {
        "requirements": parsed_data.get("requirements", []),
        "total_extracted": len(parsed_data.get("requirements", [])),
        "tokens_used": tokens_used,
    }


def _detect_conflicts_tool(requirements: List[Any]) -> Any:
    req = ConflictDetectionRequest(requirements=requirements)
    if CONFLICT_DETECTION_AVAILABLE:
        return asyncio.run(_detect_conflicts_semantic(req))
    return asyncio.run(_detect_conflicts_simple(req))


def _generate_persona_tool(text: str, persona_name: str) -> Any:
    prompt = PERSONA_PROMPT_TEMPLATE.format(persona_name=persona_name, requirement_text=text)
    messages = [
        {"role": "system", "content": f"You are a {persona_name} analyzing requirements."},
        {"role": "user", "content": prompt},
    ]
    response_text, tokens_used, _, _ = call_llm_chat(messages, max_tokens=2000, temperature=0.7)
    return {"persona_view": response_text, "tokens_used": tokens_used}


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
LLM_API_KEY=test-api-key

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
