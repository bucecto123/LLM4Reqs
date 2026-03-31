# memory_service.py - Dual-mode memory system for LLM4Reqs
"""
Dual-mode memory architecture:
- Normal Chat Mode: InMemoryChatMessageHistory (in-session, configurable window)
- Project Mode: FAISS-backed semantic retrieval (persistent, vector search)
"""
import os
import json
import pickle
import threading
import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
from pathlib import Path

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, get_buffer_string
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

logger = logging.getLogger(__name__)

# Thread-safe project memory cache
_project_memory_cache: Dict[str, "ProjectMemory"] = {}
_cache_lock = threading.Lock()


def _get_cache_key(project_id: Any) -> str:
    """Normalize project_id to string for cache keying."""
    return str(project_id)


# ==================== CONFIGURATION ====================

MEMORY_WINDOW_SIZE = int(os.getenv("MEMORY_WINDOW_SIZE", "10"))
MEMORY_BASE_DIR = os.getenv("MEMORY_BASE_DIR", "memory_store")
MEMORY_TOP_K = int(os.getenv("MEMORY_TOP_K", "5"))
MEMORY_EMBEDDING_MODEL = os.getenv("KB_MODEL", "all-MiniLM-L6-v2")


# ==================== EMBEDDING SETUP ====================

_embedding_model: Optional[Any] = None
_embedding_lock = threading.Lock()


def get_embedding_model() -> Any:
    """Get or create a singleton embedding model (sentence-transformers)."""
    global _embedding_model
    if _embedding_model is None:
        with _embedding_lock:
            if _embedding_model is None:
                from sentence_transformers import SentenceTransformer
                _embedding_model = SentenceTransformer(MEMORY_EMBEDDING_MODEL)
    return _embedding_model


def get_embeddings() -> Any:
    """Alias for backward compatibility."""
    return get_embedding_model()


# ==================== PROJECT MEMORY STORE ====================

@dataclass
class MemoryMetadata:
    """Metadata stored alongside each memory entry."""
    project_id: str
    memory_type: str  # "conversation", "entity", "decision"
    timestamp: str
    summary: Optional[str] = None
    user_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "project_id": self.project_id,
            "memory_type": self.memory_type,
            "timestamp": self.timestamp,
            "summary": self.summary,
            "user_id": self.user_id
        }


def get_project_memory_dir(project_id: Any) -> Path:
    """Get the memory store directory for a project."""
    pid_str = _get_cache_key(project_id)
    return Path(MEMORY_BASE_DIR) / f"project_{pid_str}"


def _load_or_create_vectorstore(
    project_dir: Path,
    embeddings: Any
) -> Tuple[FAISS, bool]:
    """
    Load an existing FAISS vectorstore or create a new one.
    Returns (vectorstore, was_existing).
    """
    index_file = project_dir / "index.faiss"
    docstore_file = project_dir / "docstore.pkl"

    if index_file.exists() and docstore_file.exists():
        try:
            vectorstore = FAISS.load_local(
                str(project_dir),
                embeddings,
                allow_dangerous_deserialization=True
            )
            return vectorstore, True
        except Exception as e:
            logger.warning(f"Failed to load existing vectorstore, creating new: {e}")

    # Create new empty vectorstore
    dummy_doc = Document(page_content="__memory_init__", metadata={})
    vectorstore = FAISS.from_documents([dummy_doc], embeddings)
    # Remove the dummy document
    vectorstore.delete([vectorstore.index_to_docstore_id[0]])

    return vectorstore, False


def _save_vectorstore(vectorstore: FAISS, project_dir: Path) -> None:
    """Persist vectorstore to disk."""
    project_dir.mkdir(parents=True, exist_ok=True)
    vectorstore.save_local(str(project_dir))


# ==================== ENTITY / DECISION EXTRACTION ====================

_ENTITY_EXTRACTION_PROMPT = """Extract key entities and decisions from this conversation exchange.

User message: {user_message}
AI response: {ai_response}

Return ONLY valid JSON:
{{
  "entities": [
    {{"name": "Entity Name", "description": "Brief description", "type": "requirement|feature|stakeholder|constraint|other"}}
  ],
  "decisions": [
    {{"description": "Decision description", "rationale": "Why this decision was made"}}
  ]
}}

If no significant entities or decisions, return: {{"entities": [], "decisions": []}}"""


async def _extract_entities_and_decisions(
    user_message: str,
    ai_response: str,
    model_manager: Any
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Use LLM to extract structured entities and decisions from a conversation.
    Falls back gracefully if extraction fails.
    """
    try:
        from langchain_core.messages import SystemMessage
        from langchain_groq import ChatGroq

        prompt = _ENTITY_EXTRACTION_PROMPT.format(
            user_message=user_message,
            ai_response=ai_response
        )

        # Use a lightweight model for extraction
        model = ChatGroq(
            model_name=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            temperature=0.3,
            groq_api_key=os.getenv("GROQ_API_KEY")
        )

        messages = [
            SystemMessage(content="You are a requirements assistant that extracts key facts."),
            HumanMessage(content=prompt)
        ]

        # Run in executor to avoid blocking
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, model.invoke, messages)
        content = response.content if hasattr(response, "content") else str(response)

        # Parse JSON
        import re
        json_match = re.search(r"\{.*\}", content, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(0))
            entities = parsed.get("entities", [])
            decisions = parsed.get("decisions", [])
            return entities, decisions

    except Exception as e:
        logger.debug(f"Entity/decision extraction failed (non-critical): {e}")

    return [], []


# ==================== PROJECT MEMORY CLASS ====================

class ProjectMemory:
    """
    Persistent, semantic memory for a project using FAISS vector search.
    Replaces the removed VectorStoreRetrieverMemory.
    """

    def __init__(
        self,
        project_id: Any,
        top_k: int = MEMORY_TOP_K,
        base_dir: Optional[str] = None
    ):
        self.project_id = _get_cache_key(project_id)
        self.top_k = top_k
        self.base_dir = Path(base_dir or MEMORY_BASE_DIR)
        self.project_dir = self.base_dir / f"project_{self.project_id}"
        self.embeddings = get_embedding_model()

        # Lazy-load the vectorstore
        self._vectorstore: Optional[FAISS] = None

    @property
    def vectorstore(self) -> FAISS:
        """Lazy-load vectorstore on first access."""
        if self._vectorstore is None:
            self.project_dir.mkdir(parents=True, exist_ok=True)
            self._vectorstore, _ = _load_or_create_vectorstore(
                self.project_dir, self.embeddings
            )
        return self._vectorstore

    def retrieve_for_query(self, query: str) -> List[Dict[str, Any]]:
        """
        Retrieve the top-K most relevant memories for a query.
        Returns a list of memory dicts with content and metadata.
        """
        try:
            docs_and_scores = self.vectorstore.similarity_search_with_score(query, k=self.top_k)

            memories = []
            for doc, score in docs_and_scores:
                if doc.page_content == "__memory_init__":
                    continue
                memories.append({
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                    "relevance_score": float(score)
                })
            return memories

        except Exception as e:
            logger.warning(f"Memory retrieval failed for project {self.project_id}: {e}")
            return []

    def add_conversation_memory(
        self,
        user_message: str,
        ai_response: str,
        model_manager: Optional[Any] = None
    ) -> None:
        """Save a conversation exchange as memory (async-safe)."""
        try:
            timestamp = datetime.utcnow().isoformat()

            # Build a summary of the exchange
            summary = self._build_conversation_summary(user_message, ai_response)

            doc = Document(
                page_content=summary,
                metadata={
                    "project_id": self.project_id,
                    "memory_type": "conversation",
                    "timestamp": timestamp,
                    "user_message": user_message[:500],
                    "ai_response": ai_response[:500],
                }
            )

            # Add to vectorstore
            self.vectorstore.add_documents([doc])

            # Persist
            _save_vectorstore(self.vectorstore, self.project_dir)

            # Also extract and store entities/decisions asynchronously
            if model_manager is not None:
                try:
                    asyncio.create_task(
                        self._add_structured_memories(user_message, ai_response, timestamp)
                    )
                except Exception:
                    pass  # Background task creation can fail if no event loop

        except Exception as e:
            logger.error(f"Failed to add conversation memory: {e}")

    def _build_conversation_summary(self, user_message: str, ai_response: str) -> str:
        """Build a human-readable summary of the conversation exchange."""
        user_snippet = user_message[:300].replace("\n", " ").strip()
        ai_snippet = ai_response[:300].replace("\n", " ").strip()
        return (
            f"CONVERSATION EXCHANGE:\n"
            f"User: {user_snippet}\n"
            f"AI: {ai_snippet}"
        )

    async def _add_structured_memories(
        self,
        user_message: str,
        ai_response: str,
        timestamp: str
    ) -> None:
        """Extract and store entities and decisions as separate memories."""
        try:
            entities, decisions = await _extract_entities_and_decisions(
                user_message, ai_response, None
            )

            new_docs = []
            for entity in entities:
                new_docs.append(Document(
                    page_content=f"ENTITY: {entity['name']} — {entity.get('description', '')}",
                    metadata={
                        "project_id": self.project_id,
                        "memory_type": "entity",
                        "entity_type": entity.get("type", "other"),
                        "timestamp": timestamp,
                        "name": entity["name"]
                    }
                ))

            for decision in decisions:
                new_docs.append(Document(
                    page_content=f"DECISION: {decision['description']} | Rationale: {decision.get('rationale', 'N/A')}",
                    metadata={
                        "project_id": self.project_id,
                        "memory_type": "decision",
                        "timestamp": timestamp,
                        "description": decision["description"]
                    }
                ))

            if new_docs:
                self.vectorstore.add_documents(new_docs)
                _save_vectorstore(self.vectorstore, self.project_dir)

        except Exception as e:
            logger.debug(f"Structured memory extraction skipped: {e}")

    def add_manual_memory(
        self,
        text: str,
        memory_type: str = "conversation",
        summary: Optional[str] = None
    ) -> bool:
        """Manually add a memory entry (e.g., from explicit 'remember this')."""
        try:
            timestamp = datetime.utcnow().isoformat()
            doc = Document(
                page_content=text if not summary else f"{summary}\n\nDetails: {text}",
                metadata={
                    "project_id": self.project_id,
                    "memory_type": memory_type,
                    "timestamp": timestamp,
                    "manual": True
                }
            )
            self.vectorstore.add_documents([doc])
            _save_vectorstore(self.vectorstore, self.project_dir)
            return True
        except Exception as e:
            logger.error(f"Failed to add manual memory: {e}")
            return False

    def get_all_memories(self) -> List[Dict[str, Any]]:
        """Return all stored memories for this project (for debugging/display)."""
        try:
            docs = self.vectorstore.similarity_search("__memory_init__", k=1000)
            memories = []
            for doc in docs:
                if doc.page_content == "__memory_init__":
                    continue
                memories.append({
                    "content": doc.page_content,
                    "metadata": doc.metadata
                })
            return memories
        except Exception as e:
            logger.error(f"Failed to retrieve all memories: {e}")
            return []

    def clear(self) -> bool:
        """Delete all memories for this project."""
        try:
            import shutil
            if self.project_dir.exists():
                shutil.rmtree(self.project_dir)
            self._vectorstore = None

            # Clear from global cache
            with _cache_lock:
                if self.project_id in _project_memory_cache:
                    del _project_memory_cache[self.project_id]
            return True
        except Exception as e:
            logger.error(f"Failed to clear project memory: {e}")
            return False

    def format_memories_for_context(self, query: str) -> str:
        """
        Retrieve relevant memories and format them as a context string
        to prepend to the system prompt.
        """
        memories = self.retrieve_for_query(query)
        if not memories:
            return ""

        lines = ["--- Relevant Project Memory (do not repeat information already in conversation) ---"]
        for i, mem in enumerate(memories, 1):
            lines.append(f"[Memory {i}] ({mem['metadata'].get('memory_type', 'unknown')}): {mem['content']}")
        lines.append("--- End of Project Memory ---")
        return "\n".join(lines)


# ==================== CONVERSATION MEMORY CLASS ====================
# Replaces the removed ConversationBufferWindowMemory using
# langchain_core.chat_history.InMemoryChatMessageHistory + get_buffer_string.

class ConversationMemory:
    """
    In-session memory for normal (non-project) chat.
    Uses InMemoryChatMessageHistory with a sliding window.
    """

    def __init__(
        self,
        window_size: int = MEMORY_WINDOW_SIZE,
        return_messages: bool = False
    ):
        self.window_size = window_size
        self.return_messages = return_messages
        self._history: List[BaseMessage] = []

    def _enforce_window(self) -> None:
        """Trim to window_size pairs (each pair = user + assistant = 2 messages)."""
        # Keep window_size exchanges = window_size * 2 messages
        max_msgs = self.window_size * 2
        if len(self._history) > max_msgs:
            self._history = self._history[-max_msgs:]

    def load_history(self, conversation_history: List[Dict[str, str]]) -> None:
        """
        Load conversation history into memory.
        conversation_history: list of {"role": "user"|"assistant", "content": str}
        """
        try:
            history = conversation_history[-self.window_size * 2:]
            self._history = []

            for i in range(0, len(history) - 1, 2):
                if i + 1 < len(history):
                    msg_a = history[i]
                    msg_b = history[i + 1]
                    if msg_a.get("role") == "user" and msg_b.get("role") == "assistant":
                        self._history.append(HumanMessage(content=msg_a["content"]))
                        self._history.append(AIMessage(content=msg_b["content"]))

            # Handle odd leftover user message at end
            if len(history) % 2 == 1:
                last = history[-1]
                if last.get("role") == "user":
                    self._history.append(HumanMessage(content=last["content"]))

            self._enforce_window()

        except Exception as e:
            logger.warning(f"Failed to load conversation history: {e}")

    def get_formatted_history(self) -> str:
        """Get the conversation history as a formatted string for context."""
        try:
            return get_buffer_string(self._history)
        except Exception:
            return ""

    def get_messages(self) -> List[BaseMessage]:
        """Return raw message list (for LangChain chain input)."""
        return list(self._history)

    def add_exchange(self, user_message: str, ai_response: str) -> None:
        """Record a new exchange after the AI responds."""
        try:
            self._history.append(HumanMessage(content=user_message))
            self._history.append(AIMessage(content=ai_response))
            self._enforce_window()
        except Exception as e:
            logger.warning(f"Failed to add exchange to memory: {e}")


# ==================== MEMORY SERVICE FACTORY ====================

_memory_service_lock = threading.Lock()


def get_project_memory(project_id: Any) -> ProjectMemory:
    """
    Get or create a cached ProjectMemory instance for a project.
    Thread-safe singleton per project_id.
    """
    key = _get_cache_key(project_id)

    with _cache_lock:
        if key not in _project_memory_cache:
            _project_memory_cache[key] = ProjectMemory(project_id)
        return _project_memory_cache[key]


# ==================== MEMORY CONTEXT BUILDER ====================

def build_memory_context(
    message: str,
    conversation_history: List[Dict[str, str]],
    project_id: Optional[Any] = None,
    model_manager: Optional[Any] = None
) -> Tuple[str, Optional[ConversationMemory], Optional[ProjectMemory]]:
    """
    Main entry point: build the appropriate memory context based on mode.

    Returns:
        - memory_context_str: formatted string to prepend to system prompt
        - conversation_memory: ConversationMemory instance (normal mode) or None
        - project_memory: ProjectMemory instance (project mode) or None

    Usage in chat endpoint:
        memory_context, conv_mem, proj_mem = build_memory_context(...)
        if proj_mem:
            # project mode: retrieve context from vector memory
            pass
        else:
            # normal mode: use ConversationMemory
            pass
    """
    if project_id:
        project_memory = get_project_memory(project_id)
        context_str = project_memory.format_memories_for_context(message)
        return context_str, None, project_memory
    else:
        conv_memory = ConversationMemory(window_size=MEMORY_WINDOW_SIZE)
        conv_memory.load_history(conversation_history or [])
        context_str = conv_memory.get_formatted_history()
        return context_str, conv_memory, None


def save_memory_after_response(
    user_message: str,
    ai_response: str,
    conversation_memory: Optional[ConversationMemory] = None,
    project_memory: Optional[ProjectMemory] = None,
    model_manager: Optional[Any] = None
) -> None:
    """Save the exchange to the appropriate memory backend after a response."""
    try:
        if project_memory:
            project_memory.add_conversation_memory(
                user_message, ai_response, model_manager
            )
        elif conversation_memory:
            conversation_memory.add_exchange(user_message, ai_response)
    except Exception as e:
        # Memory failures should NOT break the chat
        logger.warning(f"Non-critical memory save failure: {e}")
