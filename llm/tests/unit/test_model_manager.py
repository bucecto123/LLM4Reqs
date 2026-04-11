import pytest
from model_manager import ModelManager

@pytest.fixture
def manager():
    return ModelManager()

def test_fallback_models_exist(manager):
    """Ensure that Groq fallback models are loaded if API key fails"""
    assert len(manager.GROQ_FALLBACK_MODELS) > 0
    assert any(m["model_id"] == "llama3-70b-8192" for m in manager.GROQ_FALLBACK_MODELS)

def test_missing_api_key_throws_error():
    manager = ModelManager()
    manager.groq_api_key = None
    with pytest.raises(ValueError, match="GROQ_API_KEY not set"):
        manager.get_chat_model("groq", "llama3-8b-8192")
