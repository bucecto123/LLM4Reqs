"""
Tests for agentic tool-based retrieval and RAG context improvements.

These tests verify:
1. _build_rag_context_message surfaces metadata (confidence_score, etc.)
2. _tool_lookup_by_id finds chunks by requirement_number and requirement_id
3. _extract_numeric_id parses various ID formats
4. _detect_mismatch correctly identifies when ID and content results don't align
"""
import pytest
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock

# Ensure project root is on path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


# We import the individual functions directly from main
# These are module-level functions, not endpoint handlers
from main import (
    _build_rag_context_message,
    _tool_lookup_by_id,
    _tool_lookup_by_content,
    _extract_numeric_id,
    _detect_mismatch,
)


# ==================== Sample data fixtures ====================

@pytest.fixture
def sample_chunks_with_meta():
    """Chunks with metadata as they'd appear from a KB build."""
    # Use chunk ids (100+) that don't collide with requirement_numbers (1,2,3)
    return [
        {
            'id': 100,
            'text': 'Requirement: Users must authenticate via email and password\nType: functional\nPriority: high',
            'meta': {
                'requirement_id': 42,
                'requirement_number': 1,
                'confidence_score': 0.95,
                'requirement_type': 'functional',
                'priority': 'high',
                'document_id': 10,
                'project_id': 1,
            }
        },
        {
            'id': 101,
            'text': 'Requirement: System must respond within 2 seconds\nType: non-functional\nPriority: medium',
            'meta': {
                'requirement_id': 43,
                'requirement_number': 2,
                'confidence_score': 0.88,
                'requirement_type': 'non-functional',
                'priority': 'medium',
                'document_id': 10,
                'project_id': 1,
            }
        },
        {
            'id': 102,
            'text': 'Requirement: All data must be encrypted at rest\nType: security\nPriority: high',
            'meta': {
                'requirement_id': 44,
                'requirement_number': 3,
                'confidence_score': 0.92,
                'requirement_type': 'security',
                'priority': 'high',
                'document_id': 11,
                'project_id': 1,
            }
        },
    ]


@pytest.fixture
def sample_retrieved_chunks(sample_chunks_with_meta):
    """Retrieved chunks with similarity scores added."""
    retrieved = []
    for i, chunk in enumerate(sample_chunks_with_meta):
        retrieved.append({
            **chunk,
            'score': 0.85 - (i * 0.1),  # Decreasing scores: 0.85, 0.75, 0.65
        })
    return retrieved


# ==================== _build_rag_context_message tests ====================

class TestBuildRagContextMessage:
    """Test that _build_rag_context_message surfaces metadata correctly."""

    def test_empty_list_returns_empty(self):
        """Empty input should return empty string."""
        assert _build_rag_context_message([]) == ""

    def test_includes_confidence_score(self, sample_retrieved_chunks):
        """Confidence score from metadata should appear in the context."""
        result = _build_rag_context_message(sample_retrieved_chunks)
        assert "Confidence: 0.95" in result
        assert "Confidence: 0.88" in result
        assert "Confidence: 0.92" in result

    def test_includes_requirement_number(self, sample_retrieved_chunks):
        """Requirement number should appear in the context."""
        result = _build_rag_context_message(sample_retrieved_chunks)
        assert "Requirement #: 1" in result
        assert "Requirement #: 2" in result
        assert "Requirement #: 3" in result

    def test_includes_db_id(self, sample_retrieved_chunks):
        """Database ID should appear in the context."""
        result = _build_rag_context_message(sample_retrieved_chunks)
        assert "DB ID: 42" in result
        assert "DB ID: 43" in result

    def test_includes_type_and_priority(self, sample_retrieved_chunks):
        """Requirement type and priority should appear."""
        result = _build_rag_context_message(sample_retrieved_chunks)
        assert "Type: functional" in result
        assert "Priority: high" in result
        assert "Priority: medium" in result

    def test_includes_similarity_score(self, sample_retrieved_chunks):
        """Similarity score should still appear."""
        result = _build_rag_context_message(sample_retrieved_chunks)
        assert "Similarity: 0.8500" in result

    def test_includes_no_fabricate_instruction(self, sample_retrieved_chunks):
        """Should instruct LLM not to fabricate metadata values."""
        result = _build_rag_context_message(sample_retrieved_chunks)
        assert "Do NOT invent" in result

    def test_handles_missing_metadata(self):
        """Should handle chunks with no metadata gracefully."""
        chunks = [{'text': 'Some text', 'score': 0.5, 'meta': {}}]
        result = _build_rag_context_message(chunks)
        assert "Some text" in result
        assert "Similarity: 0.5000" in result
        # Should NOT contain metadata labels for missing values
        assert "Confidence:" not in result
        assert "Requirement #:" not in result

    def test_handles_nested_original_row_metadata(self):
        """Should flatten CSV-based chunks with nested 'original_row' meta."""
        chunks = [{
            'text': 'A requirement',
            'score': 0.7,
            'meta': {
                'original_row': {
                    'confidence_score': 0.91,
                    'requirement_number': 5,
                }
            }
        }]
        result = _build_rag_context_message(chunks)
        assert "Confidence: 0.91" in result
        assert "Requirement #: 5" in result


# ==================== _extract_numeric_id tests ====================

class TestExtractNumericId:
    """Test ID extraction from various formats."""

    def test_plain_number(self):
        assert _extract_numeric_id("5") == "5"

    def test_req_prefix(self):
        assert _extract_numeric_id("REQ-5") == "5"

    def test_hash_prefix(self):
        assert _extract_numeric_id("#3") == "3"

    def test_requirement_word(self):
        assert _extract_numeric_id("requirement 42") == "42"

    def test_none_input(self):
        assert _extract_numeric_id(None) is None

    def test_no_number(self):
        # Should return the stripped string if no numeric found
        assert _extract_numeric_id("abc") == "abc"


# ==================== _tool_lookup_by_id tests ====================

class TestToolLookupById:
    """Test ID-based chunk lookup."""

    def test_finds_by_requirement_number(self, sample_chunks_with_meta):
        """Should find chunk by requirement_number."""
        results = _tool_lookup_by_id("1", sample_chunks_with_meta)
        assert len(results) == 1
        assert results[0]['meta']['requirement_number'] == 1
        assert results[0]['score'] == 1.0
        assert results[0]['match_type'] == 'requirement_number'

    def test_finds_by_req_prefix(self, sample_chunks_with_meta):
        """Should parse 'REQ-2' and find requirement_number 2."""
        results = _tool_lookup_by_id("REQ-2", sample_chunks_with_meta)
        assert len(results) == 1
        assert results[0]['meta']['requirement_number'] == 2

    def test_finds_by_hash_prefix(self, sample_chunks_with_meta):
        """Should parse '#3' and find requirement_number 3."""
        results = _tool_lookup_by_id("#3", sample_chunks_with_meta)
        assert len(results) == 1
        assert results[0]['meta']['requirement_number'] == 3

    def test_finds_by_requirement_id(self, sample_chunks_with_meta):
        """Should find chunk by database requirement_id when no requirement_number matches."""
        # Look for ID 44 (which is requirement_number 3, but also requirement_id 44)
        results = _tool_lookup_by_id("44", sample_chunks_with_meta)
        assert len(results) >= 1
        # Should match via requirement_id
        assert any(r['meta']['requirement_id'] == 44 for r in results)

    def test_no_match_returns_empty(self, sample_chunks_with_meta):
        """Should return empty list when no match found."""
        results = _tool_lookup_by_id("999", sample_chunks_with_meta)
        assert len(results) == 0

    def test_empty_chunks(self):
        """Should handle empty chunks list."""
        results = _tool_lookup_by_id("1", [])
        assert len(results) == 0


# ==================== _detect_mismatch tests ====================

class TestDetectMismatch:
    """Test mismatch detection between ID and content results."""

    def test_no_mismatch_when_overlap(self):
        """Should return None when ID result appears in content results."""
        id_results = [{'meta': {'requirement_number': 1}, 'text': 'req 1'}]
        content_results = [
            {'meta': {'requirement_number': 1}, 'text': 'req 1'},
            {'meta': {'requirement_number': 2}, 'text': 'req 2'},
        ]
        assert _detect_mismatch(id_results, content_results) is None

    def test_mismatch_detected(self):
        """Should detect mismatch when ID result is not in content results."""
        id_results = [{'meta': {'requirement_number': 5}, 'text': 'req 5'}]
        content_results = [
            {'meta': {'requirement_number': 1}, 'text': 'req 1'},
            {'meta': {'requirement_number': 2}, 'text': 'req 2'},
            {'meta': {'requirement_number': 3}, 'text': 'req 3'},
        ]
        result = _detect_mismatch(id_results, content_results)
        assert result is not None
        assert "MISMATCH" in result

    def test_no_mismatch_when_only_id(self):
        """Should return None when only ID results (no content to compare)."""
        id_results = [{'meta': {'requirement_number': 1}, 'text': 'req 1'}]
        assert _detect_mismatch(id_results, []) is None

    def test_no_mismatch_when_only_content(self):
        """Should return None when only content results (no ID to compare)."""
        content_results = [{'meta': {'requirement_number': 1}, 'text': 'req 1'}]
        assert _detect_mismatch([], content_results) is None

    def test_no_mismatch_both_empty(self):
        """Should return None when both are empty."""
        assert _detect_mismatch([], []) is None
