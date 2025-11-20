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
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Tuple
from groq import Groq
import os
import json
import uuid
import asyncio
from dotenv import load_dotenv
from datetime import datetime

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

# Import domain-agnostic conflict detection dependencies
try:
    from sentence_transformers import SentenceTransformer
    import hdbscan
    from sklearn.metrics.pairwise import cosine_similarity
    CONFLICT_DETECTION_AVAILABLE = True
except ImportError:
    CONFLICT_DETECTION_AVAILABLE = False
    SentenceTransformer = None
    hdbscan = None
    cosine_similarity = None

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

# Internal state for RAG and conflict detection
_rag_manager = None
_rag_index = None
_rag_chunks = None
_rag_available = False
_embedding_model_cache = None

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


def _get_rag_manager():
    """Get or create a RagManager instance."""
    if RagManager is None:
        raise HTTPException(
            status_code=500,
            detail="RAG dependencies not installed. Install sentence-transformers and faiss-cpu.",
        )
    return RagManager(model_name=KB_MODEL)


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

    response_text, tokens_used = call_groq_chat(
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
            (req_ids[i], req_texts[i]) for i in cluster_indices
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
    requirements: List[Tuple[str, str]], 
    cluster_id: int
) -> List[Conflict]:
    """
    Use LLM to check for conflicts in a batch of requirements.
    
    Args:
        requirements: List of (req_id, req_text) tuples
        cluster_id: Cluster ID for tracking
        
    Returns:
        List of detected conflicts
    """
    if len(requirements) < 2:
        return []
    
    # Build structured prompt
    req_list = "\n".join([
        f"{i+1}. [{req_id}] {text}"
        for i, (req_id, text) in enumerate(requirements)
    ])
    
    prompt = f"""You are analyzing requirements for logical conflicts.

Requirements to analyze:
{req_list}

Task: Identify any pairs of requirements that CANNOT both be true or would create a logical contradiction.

Return your analysis as a JSON array. For each conflict found, include:
- req_a: ID of first requirement (use the exact ID from the brackets, e.g., "1", "REQ_0001")
- req_b: ID of second requirement
- reason: Brief explanation of the conflict
- confidence: "high", "medium", or "low"
- severity: "high", "medium", or "low"

If no conflicts exist, return an empty array: []

Response format:
[
  {{"req_a": "1", "req_b": "3", "reason": "...", "confidence": "high", "severity": "high"}},
  ...
]

JSON output only:"""

    try:
        response = groq_client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000,
        )
        
        response_text = response.choices[0].message.content.strip()
        
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
        
        # Create Conflict objects
        req_map = {req_id: text for req_id, text in requirements}
        conflicts = []
        
        for conflict in conflicts_data:
            req_a = str(conflict.get("req_a", ""))
            req_b = str(conflict.get("req_b", ""))
            
            # Convert ID to integer (handle both numeric and string IDs)
            id_a = int(req_a) if req_a.isdigit() else abs(hash(req_a)) % 100000
            id_b = int(req_b) if req_b.isdigit() else abs(hash(req_b)) % 100000
            
            conflicts.append(Conflict(
                requirement_id_1=id_a,
                requirement_id_2=id_b,
                conflict_description=conflict.get("reason", "No reason provided"),
                severity=conflict.get("severity", "medium"),
                req_text_1=req_map.get(req_a, ""),
                req_text_2=req_map.get(req_b, ""),
                confidence=conflict.get("confidence", "medium"),
                cluster_id=cluster_id
            ))
        
        return conflicts
        
    except json.JSONDecodeError as e:
        print(f"⚠️ JSON parsing error in conflict detection: {e}")
        print(f"   Response preview: {response_text[:200]}...")
        return []
    except Exception as e:
        print(f"⚠️ Error checking batch for conflicts: {str(e)}")
        return []


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
        
        messages = [{"role": "system", "content": system_prompt}]

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
                "content": "You are Fishy, a requirements extraction expert. Always return valid JSON.",
            },
            {"role": "user", "content": prompt},
        ]

        # Use lower temperature for more consistent JSON output
        response_text, tokens_used = call_groq_chat(
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

        response_text, tokens_used = call_groq_chat(
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
