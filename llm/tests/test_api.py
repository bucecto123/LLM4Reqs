"""
Tests for main FastAPI endpoints.
"""
import pytest
from unittest.mock import patch, MagicMock
import json


class TestHealthEndpoint:
    """Test health check endpoint."""

    def test_health_check(self, client):
        """Test basic health endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"


class TestChatEndpoint:
    """Test chat endpoint functionality."""

    @patch('main.call_groq_chat')
    def test_chat_success(self, mock_call_groq, client):
        """Test successful chat interaction."""
        # Mock the Groq response
        mock_call_groq.return_value = ("Hello! How can I help with requirements?", 150)

        payload = {
            "message": "Hello",
            "conversation_history": []
        }

        response = client.post("/api/chat", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert "response" in data
        assert "tokens_used" in data
        assert "model" in data
        assert data["tokens_used"] == 150

    def test_chat_missing_message(self, client):
        """Test chat with missing message."""
        payload = {"conversation_history": []}

        response = client.post("/api/chat", json=payload)
        assert response.status_code == 422  # Validation error

    @patch('main.call_groq_chat')
    def test_chat_with_persona(self, mock_call_groq, client):
        """Test chat with persona context."""
        mock_call_groq.return_value = ("As a developer, I recommend...", 200)

        payload = {
            "message": "How should we implement authentication?",
            "persona_data": {
                "name": "Developer",
                "role": "Software Developer",
                "technical_level": "expert"
            }
        }

        response = client.post("/api/chat", json=payload)
        assert response.status_code == 200
        assert "developer" in response.json()["response"].lower()


class TestExtractionEndpoint:
    """Test requirement extraction endpoint."""

    @patch('main.call_groq_chat')
    def test_extraction_success(self, mock_call_groq, client):
        """Test successful requirement extraction."""
        mock_response = {
            "requirements": [
                {
                    "requirement_text": "Users must login",
                    "requirement_type": "functional",
                    "priority": "high",
                    "confidence_score": 0.95
                }
            ]
        }
        mock_call_groq.return_value = (json.dumps(mock_response), 300)

        payload = {
            "text": "Users need to be able to login to the system."
        }

        response = client.post("/api/extract", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert "requirements" in data
        assert "total_extracted" in data
        assert "tokens_used" in data
        assert len(data["requirements"]) == 1
        assert data["requirements"][0]["requirement_type"] == "functional"

    def test_extraction_empty_text(self, client):
        """Test extraction with empty text."""
        payload = {"text": ""}

        response = client.post("/api/extract", json=payload)
        assert response.status_code == 422  # Validation error


class TestPersonaEndpoint:
    """Test persona generation endpoint."""

    @patch('main.call_groq_chat')
    def test_persona_generation_success(self, mock_call_groq, client):
        """Test successful persona view generation."""
        mock_call_groq.return_value = ("From a developer perspective: Use JWT tokens...", 250)

        payload = {
            "requirement_text": "Users must authenticate",
            "persona_name": "Developer",
            "persona_prompt": "Focus on technical implementation"
        }

        response = client.post("/api/persona/generate", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert "persona_view" in data
        assert "tokens_used" in data
        assert data["tokens_used"] == 250


class TestConflictDetectionEndpoint:
    """Test conflict detection endpoints."""

    @patch('main._detect_conflicts_semantic')
    def test_conflict_detection_success(self, mock_detect, client):
        """Test successful conflict detection."""
        mock_result = MagicMock()
        mock_result.conflicts = [
            {
                "requirement_id_1": 1,
                "requirement_id_2": 2,
                "conflict_description": "Contradictory requirements",
                "severity": "high"
            }
        ]
        mock_result.total_conflicts = 1
        mock_result.total_requirements = 5
        mock_result.clusters_found = 3
        mock_result.method = "semantic_clustering"

        mock_detect.return_value = mock_result

        payload = {
            "requirements": [
                {"id": 1, "text": "Must work offline"},
                {"id": 2, "text": "Requires real-time sync"},
                {"id": 3, "text": "Use local storage"},
                {"id": 4, "text": "Cloud-based solution"},
                {"id": 5, "text": "Fast response time"}
            ]
        }

        response = client.post("/api/conflicts/detect", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert "conflicts" in data
        assert "total_conflicts" in data
        assert "total_requirements" in data
        assert data["total_conflicts"] == 1

    def test_conflict_detection_empty_requirements(self, client):
        """Test conflict detection with empty requirements."""
        payload = {"requirements": []}

        response = client.post("/api/conflicts/detect", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["total_conflicts"] == 0


class TestKBEndpoints:
    """Test Knowledge Base endpoints."""

    def test_kb_build_unauthorized(self, client):
        """Test KB build without API key."""
        payload = {
            "project_id": "test",
            "documents": [{"content": "test", "type": "test"}]
        }

        response = client.post("/kb/build", json=payload)
        assert response.status_code == 403

    def test_kb_query_unauthorized(self, client):
        """Test KB query without API key."""
        payload = {
            "project_id": "test",
            "query": "test query"
        }

        response = client.post("/kb/query", json=payload)
        assert response.status_code == 403

    def test_kb_status_unauthorized(self, client):
        """Test KB status without API key."""
        response = client.get("/kb/status/test")
        assert response.status_code == 403

    @patch('main._get_rag_manager')
    def test_kb_status_not_found(self, mock_rag, client):
        """Test KB status for non-existent project."""
        mock_rag_instance = MagicMock()
        mock_rag_instance.get_kb_status.return_value = {
            "exists": False,
            "version": 0,
            "last_built_at": None,
            "total_chunks": 0,
            "error": None
        }
        mock_rag.return_value = mock_rag_instance

        response = client.get("/kb/status/nonexistent",
                            headers={"X-API-Key": "test-api-key"})
        assert response.status_code == 200

        data = response.json()
        assert data["exists"] is False
        assert data["total_chunks"] == 0


class TestProcessDocumentEndpoint:
    """Test document processing endpoint."""

    @patch('main.call_groq_chat')
    def test_process_document_success(self, mock_call_groq, client):
        """Test successful document processing."""
        mock_response = {
            "requirements": [
                {
                    "requirement_text": "Users must login",
                    "requirement_type": "functional",
                    "priority": "high",
                    "confidence_score": 0.95
                }
            ]
        }
        mock_call_groq.return_value = (json.dumps(mock_response), 200)

        payload = {
            "project_id": "test_project",
            "document_content": "Users need to login to access the system."
        }

        response = client.post("/process_document", json=payload,
                             headers={"X-API-Key": "test-api-key"})
        assert response.status_code == 200

        data = response.json()
        assert "requirements" in data
        assert "chunks" in data
        assert "total_chunks" in data
        assert data["project_id"] == "test_project"

    def test_process_document_no_content(self, client):
        """Test document processing without content."""
        payload = {"project_id": "test"}

        response = client.post("/process_document", json=payload,
                             headers={"X-API-Key": "test-api-key"})
        assert response.status_code == 400


class TestRootEndpoint:
    """Test root endpoint."""

    def test_root_endpoint(self, client):
        """Test root endpoint returns service info."""
        response = client.get("/")
        assert response.status_code == 200

        data = response.json()
        assert "service" in data
        assert "AI Requirements Generation Service" in data["service"]
        assert "version" in data
        assert "status" in data