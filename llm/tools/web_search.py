"""
Web Search Tool — Tavily primary, DuckDuckGo fallback.
"""
import os
import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# ---- Trigger detection ----

WEB_SEARCH_TRIGGERS = {
    "search for", "look up", "what is", "latest", "recent",
    "how do i", "framework", "standard", "library", "api reference",
    "documentation", "how to implement", "google", "bing", "github",
    "npm", "pypi", "rfc", "ieee", "iso", "nist",
}


def should_web_search(message: str) -> bool:
    """Return True if the message looks like it needs real-time web info."""
    msg = message.lower().strip()
    return any(trigger in msg for trigger in WEB_SEARCH_TRIGGERS)


def format_search_results(query: str, results: list) -> str:
    """Format search results as a readable string block."""
    if not results:
        return ""
    lines = [f"Web search results for '{query}':"]
    for i, r in enumerate(results, 1):
        lines.append(f"  {i}. {r.get('title', 'Untitled')} — {r.get('url', '')}")
        snippet = r.get('snippet', '') or r.get('content', '')
        if snippet:
            lines.append(f"     {snippet[:200]}")
    return "\n".join(lines)


# ---- Tavily ----

class TavilySearchTool:
    """Primary web search using the Tavily API."""

    def __init__(self, api_key: Optional[str] = None, top_k: int = 5):
        self.api_key = api_key or os.getenv("TAVILY_API_KEY", "").strip()
        self.top_k = top_k
        self._available = bool(self.api_key)

    @property
    def available(self) -> bool:
        return self._available

    def search(self, query: str, top_k: Optional[int] = None) -> List[Dict[str, Any]]:
        if not self.available:
            return []
        try:
            from tavily import TavilyClient
            client = TavilyClient(api_key=self.api_key)
            result = client.search(
                query=query,
                max_results=top_k or self.top_k,
                include_answer=True,
                include_raw_content=False,
            )
            results = result.get("results", [])
            return [
                {
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "snippet": r.get("content", ""),
                    "score": r.get("score", 0.0),
                }
                for r in results
            ]
        except Exception as e:
            logger.warning(f"Tavily search failed: {e}")
            return []


# ---- DuckDuckGo (free fallback) ----

class DuckDuckGoSearchTool:
    """Free fallback using duckduckgo-search."""

    def __init__(self, top_k: int = 5):
        self.top_k = top_k
        self._available = None

    @property
    def available(self) -> bool:
        if self._available is None:
            try:
                from duckduckgo_search import DDGS
                with DDGS() as ddgs:
                    list(ddgs.news(keywords="test", max_results=1))
                self._available = True
            except Exception:
                self._available = False
        return self._available

    def search(self, query: str, top_k: Optional[int] = None) -> List[Dict[str, Any]]:
        if not self.available:
            return []
        try:
            from duckduckgo_search import DDGS
            results = []
            with DDGS() as ddgs:
                for r in ddgs.text(keywords=query, max_results=top_k or self.top_k):
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("href", ""),
                        "snippet": r.get("body", ""),
                        "score": 1.0,
                    })
            return results
        except Exception as e:
            logger.warning(f"DuckDuckGo search failed: {e}")
            return []


# ---- Orchestrator ----

class WebSearchOrchestrator:
    """
    Decides when and how to search.
    Priority: Tavily (if key set) > DuckDuckGo > no-op.
    """

    def __init__(self):
        self.tavily = TavilySearchTool()
        self.ddg = DuckDuckGoSearchTool()

    def is_available(self) -> bool:
        return self.tavily.available or self.ddg.available

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Try Tavily first, then DuckDuckGo fallback."""
        if self.tavily.available:
            results = self.tavily.search(query, top_k)
            if results:
                logger.info(f"Tavily returned {len(results)} results for: {query[:60]}")
                return results
        if self.ddg.available:
            results = self.ddg.search(query, top_k)
            logger.info(f"DuckDuckGo returned {len(results)} results for: {query[:60]}")
            return results
        logger.warning(f"No web search provider available for: {query[:60]}")
        return []


# ---- Module-level singleton (lazy init) ----

_orchestrator: Optional[WebSearchOrchestrator] = None


def get_orchestrator() -> WebSearchOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = WebSearchOrchestrator()
    return _orchestrator


async def run_web_search(message: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Async wrapper — runs web search in a thread pool to avoid blocking the event loop.
    """
    import asyncio
    loop = asyncio.get_event_loop()
    orch = get_orchestrator()
    return await loop.run_in_executor(None, orch.search, message, top_k)
