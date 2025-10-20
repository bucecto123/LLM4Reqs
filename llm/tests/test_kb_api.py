"""
Unit tests for Knowledge Base API endpoints.
"""
import pytest
import os
import sys
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock dependencies before importing main
with patch('main.RagManager'), patch('main.build_index_for_project'):
    from main import app

client = TestClient(app)

# Test API key
TEST_API_KEY = "dev-secret-key-12345"
HEADERS = {"X-API-Key": TEST_API_KEY}

class TestProcessDocument:
    """Tests for /process_document endpoint"""
    
    @patch('main.call_groq_chat')
    def test_process_document_success(self, mock_groq):
        """Test successful document processing"""
        # Mock Groq response
        mock_groq.return_value = (
            '{"requirements": [{"requirement_text": "User login", "requirement_type": "functional", "priority": "high", "confidence_score": 0.9}]}',
            100
        )
        
        response = client.post(
            "/process_document",
            headers=HEADERS,
            json={
                "project_id": "test_proj_1",
                "document_content": "The system must allow user login",
                "document_type": "requirements"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["project_id"] == "test_proj_1"
        assert len(data["requirements"]) == 1
        assert data["requirements"][0]["requirement_text"] == "User login"
        assert len(data["chunks"]) == 1
        assert data["total_chunks"] == 1
        assert data["tokens_used"] == 100
    
    def test_process_document_no_content(self):
        """Test process document without content"""
        response = client.post(
            "/process_document",
            headers=HEADERS,
            json={
                "project_id": "test_proj_1"
            }
        )
        
        assert response.status_code == 400
        assert "document_content or document_url must be provided" in response.json()["detail"]
    
    def test_process_document_no_api_key(self):
        """Test process document without API key"""
        response = client.post(
            "/process_document",
            json={
                "project_id": "test_proj_1",
                "document_content": "test content"
            }
        )
        
        assert response.status_code == 403


class TestBuildKB:
    """Tests for /kb/build endpoint"""
    
    @patch('main.build_index_for_project')
    def test_build_kb_sync(self, mock_build):
        """Test synchronous KB build"""
        mock_build.return_value = {
            'index_path': '/path/to/index',
            'meta_path': '/path/to/meta'
        }
        
        response = client.post(
            "/kb/build",
            headers=HEADERS,
            json={
                "project_id": "test_proj_1",
                "documents": [
                    {"content": "Requirement 1", "type": "functional"},
                    {"content": "Requirement 2", "type": "non-functional"}
                ],
                "mode": "sync"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["project_id"] == "test_proj_1"
        assert data["status"] == "completed"
        assert data["job_id"] is None
        assert data["total_chunks"] == 2
    
    def test_build_kb_async(self):
        """Test asynchronous KB build"""
        response = client.post(
            "/kb/build",
            headers=HEADERS,
            json={
                "project_id": "test_proj_1",
                "documents": [
                    {"content": "Requirement 1", "type": "functional"}
                ],
                "mode": "async"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["project_id"] == "test_proj_1"
        assert data["status"] == "queued"
        assert data["job_id"] is not None
        assert data["job_id"].startswith("job_")
    
    def test_build_kb_empty_documents(self):
        """Test build KB with empty documents"""
        response = client.post(
            "/kb/build",
            headers=HEADERS,
            json={
                "project_id": "test_proj_1",
                "documents": [],
                "mode": "sync"
            }
        )
        
        assert response.status_code == 400


class TestIncrementalKB:
    """Tests for /kb/incremental endpoint"""
    
    @patch('main._get_rag_manager')
    @patch('os.path.exists')
    def test_incremental_add_success(self, mock_exists, mock_get_rag):
        """Test successful incremental add"""
        mock_exists.return_value = True
        mock_rag = MagicMock()
        mock_rag.get_project_paths.return_value = ('/path/index', '/path/meta')
        mock_rag.incremental_add.return_value = (Mock(), [{"id": 0}, {"id": 1}, {"id": 2}])
        mock_get_rag.return_value = mock_rag
        
        response = client.post(
            "/kb/incremental",
            headers=HEADERS,
            json={
                "project_id": "test_proj_1",
                "documents": [
                    {"content": "New requirement", "type": "functional"}
                ]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["project_id"] == "test_proj_1"
        assert data["status"] == "completed"
        assert data["added_chunks"] == 1
        assert data["total_chunks"] == 3
    
    @patch('main._get_rag_manager')
    @patch('os.path.exists')
    def test_incremental_add_no_existing_kb(self, mock_exists, mock_get_rag):
        """Test incremental add when KB doesn't exist"""
        mock_exists.return_value = False
        mock_rag = MagicMock()
        mock_rag.get_project_paths.return_value = ('/path/index', '/path/meta')
        mock_get_rag.return_value = mock_rag
        
        response = client.post(
            "/kb/incremental",
            headers=HEADERS,
            json={
                "project_id": "test_proj_1",
                "documents": [{"content": "New requirement"}]
            }
        )
        
        assert response.status_code == 404


class TestQueryKB:
    """Tests for /kb/query endpoint"""
    
    @patch('main._get_rag_manager')
    @patch('os.path.exists')
    def test_query_kb_success(self, mock_exists, mock_get_rag):
        """Test successful KB query"""
        mock_exists.return_value = True
        mock_rag = MagicMock()
        mock_rag.get_project_paths.return_value = ('/path/index', '/path/meta')
        mock_rag.load_index_and_meta.return_value = (Mock(), [])
        mock_rag.query.return_value = [
            {"id": 0, "text": "Requirement 1", "score": 0.95, "meta": {}},
            {"id": 1, "text": "Requirement 2", "score": 0.85, "meta": {}}
        ]
        mock_get_rag.return_value = mock_rag
        
        response = client.post(
            "/kb/query",
            headers=HEADERS,
            json={
                "project_id": "test_proj_1",
                "query": "authentication requirements",
                "top_k": 5
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["project_id"] == "test_proj_1"
        assert data["query"] == "authentication requirements"
        assert len(data["results"]) == 2
        assert data["total_results"] == 2
    
    @patch('main._get_rag_manager')
    @patch('os.path.exists')
    def test_query_kb_not_found(self, mock_exists, mock_get_rag):
        """Test query when KB doesn't exist"""
        mock_exists.return_value = False
        mock_rag = MagicMock()
        mock_rag.get_project_paths.return_value = ('/path/index', '/path/meta')
        mock_get_rag.return_value = mock_rag
        
        response = client.post(
            "/kb/query",
            headers=HEADERS,
            json={
                "project_id": "nonexistent_proj",
                "query": "test query",
                "top_k": 5
            }
        )
        
        assert response.status_code == 404


class TestKBStatus:
    """Tests for /kb/status endpoint"""
    
    @patch('main._get_rag_manager')
    def test_kb_status_exists(self, mock_get_rag):
        """Test KB status when KB exists"""
        mock_rag = MagicMock()
        mock_rag.get_project_paths.return_value = ('/path/index', '/path/meta')
        mock_rag.get_kb_status.return_value = {
            'exists': True,
            'version': 2,
            'last_built_at': '2025-10-20T10:00:00',
            'total_chunks': 50,
            'error': None
        }
        mock_get_rag.return_value = mock_rag
        
        response = client.get(
            "/kb/status/test_proj_1",
            headers=HEADERS
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["project_id"] == "test_proj_1"
        assert data["exists"] is True
        assert data["version"] == 2
        assert data["total_chunks"] == 50
    
    @patch('main._get_rag_manager')
    def test_kb_status_not_exists(self, mock_get_rag):
        """Test KB status when KB doesn't exist"""
        mock_rag = MagicMock()
        mock_rag.get_project_paths.return_value = ('/path/index', '/path/meta')
        mock_rag.get_kb_status.return_value = {
            'exists': False,
            'version': 0,
            'last_built_at': None,
            'total_chunks': 0,
            'error': None
        }
        mock_get_rag.return_value = mock_rag
        
        response = client.get(
            "/kb/status/nonexistent_proj",
            headers=HEADERS
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["exists"] is False
        assert data["version"] == 0


class TestJobStatus:
    """Tests for /kb/job endpoint"""
    
    def test_get_job_status_not_found(self):
        """Test get job status for non-existent job"""
        response = client.get(
            "/kb/job/nonexistent_job",
            headers=HEADERS
        )
        
        assert response.status_code == 404


class TestAuthentication:
    """Tests for API key authentication"""
    
    def test_invalid_api_key(self):
        """Test request with invalid API key"""
        response = client.post(
            "/kb/query",
            headers={"X-API-Key": "invalid-key"},
            json={
                "project_id": "test_proj",
                "query": "test",
                "top_k": 5
            }
        )
        
        assert response.status_code == 403
    
    def test_missing_api_key(self):
        """Test request without API key"""
        response = client.get("/kb/status/test_proj")
        
        assert response.status_code == 403


class TestHelperFunctions:
    """Tests for helper functions"""
    
    def test_prepare_document_chunks(self):
        """Test document chunks preparation"""
        from main import _prepare_document_chunks
        
        documents = [
            {"content": "Req 1", "type": "functional", "meta": {"priority": "high"}},
            {"content": "Req 2", "type": "non-functional"}
        ]
        
        chunks = _prepare_document_chunks(documents)
        
        assert len(chunks) == 2
        assert chunks[0]["id"] == 0
        assert chunks[0]["text"] == "Req 1"
        assert chunks[0]["meta"]["type"] == "functional"
        assert chunks[0]["meta"]["priority"] == "high"
        assert chunks[1]["id"] == 1
        assert chunks[1]["text"] == "Req 2"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
