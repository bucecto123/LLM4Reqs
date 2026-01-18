"""
Test configuration and fixtures for LLM4Reqs testing.
"""
import os
import sys
import tempfile
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from main import app


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def sample_requirements_csv():
    """Create a temporary CSV file with sample requirements for testing."""
    data = {
        'requirement': [
            'Users must be able to login with email and password',
            'The system must process payments securely',
            'Response time must be under 2 seconds',
            'Data must be encrypted at rest',
            'Users can reset their password via email'
        ]
    }
    df = pd.DataFrame(data)

    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        df.to_csv(f.name, index=False)
        temp_path = f.name

    yield temp_path

    # Cleanup
    os.unlink(temp_path)


@pytest.fixture
def test_env():
    """Set up test environment variables."""
    original_env = dict(os.environ)

    # Set test environment variables
    os.environ['GROQ_API_KEY'] = 'test-key'
    os.environ['LLM_API_KEY'] = 'test-api-key'
    os.environ['KB_BASE_DIR'] = 'test_faiss_store'

    yield

    # Restore original environment
    os.environ.clear()
    os.environ.update(original_env)


@pytest.fixture
def mock_groq_response():
    """Mock response for Groq API calls."""
    class MockResponse:
        def __init__(self, content):
            self.content = content

    return MockResponse


@pytest.fixture
def sample_kb_documents():
    """Sample documents for knowledge base testing."""
    return [
        {
            "content": "Users must authenticate using email and password",
            "type": "functional",
            "meta": {"priority": "high"}
        },
        {
            "content": "System must respond within 2 seconds",
            "type": "non-functional",
            "meta": {"priority": "medium"}
        },
        {
            "content": "All data must be encrypted",
            "type": "security",
            "meta": {"priority": "high"}
        }
    ]