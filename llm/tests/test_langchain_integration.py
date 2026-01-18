"""
Tests for LangChain integration and LLM functionality.
"""
import pytest
from unittest.mock import patch, MagicMock
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
import json


class TestLangChainIntegration:
    """Test LangChain-Groq integration."""

    def test_chatgroq_initialization(self):
        """Test ChatGroq can be initialized."""
        llm = ChatGroq(
            groq_api_key="test-key",
            model_name="groq/compound-mini",
            temperature=0.3
        )

        assert llm is not None
        assert llm.model_name == "groq/compound-mini"
        assert llm.temperature == 0.3

    @patch('langchain_groq.ChatGroq.invoke')
    def test_langchain_message_format(self, mock_invoke):
        """Test that messages are properly formatted for LangChain."""
        mock_response = MagicMock()
        mock_response.content = "Test response"
        mock_invoke.return_value = mock_response

        llm = ChatGroq(groq_api_key="test-key", model_name="groq/compound-mini")

        messages = [HumanMessage(content="Test prompt")]
        response = llm.invoke(messages)

        assert response.content == "Test response"
        mock_invoke.assert_called_once_with(messages)

    def test_human_message_creation(self):
        """Test HumanMessage creation."""
        message = HumanMessage(content="Test content")

        assert message.content == "Test content"
        assert message.type == "human"


class TestLLMResponseParsing:
    """Test LLM response parsing functionality."""

    def test_parse_json_response_success(self):
        """Test successful JSON parsing from LLM response."""
        from main import parse_json_response

        response_text = '{"requirements": [{"text": "test", "type": "functional"}]}'
        result = parse_json_response(response_text)

        assert "requirements" in result
        assert len(result["requirements"]) == 1

    def test_parse_json_response_with_markdown(self):
        """Test JSON parsing from markdown code blocks."""
        from main import parse_json_response

        response_text = '''```json
        {"requirements": [{"text": "test", "type": "functional"}]}
        ```'''
        result = parse_json_response(response_text)

        assert "requirements" in result
        assert result["requirements"][0]["text"] == "test"

    def test_parse_json_response_malformed(self):
        """Test handling of malformed JSON."""
        from main import parse_json_response

        with pytest.raises(Exception):  # Should raise JSON decode error
            parse_json_response("invalid json")

    def test_parse_json_response_nested_json(self):
        """Test extracting JSON from within response text."""
        from main import parse_json_response

        response_text = '''Here is the response:
        {"requirements": [{"text": "test"}]}
        Hope this helps!'''

        result = parse_json_response(response_text)
        assert "requirements" in result


class TestPromptTemplates:
    """Test prompt template functionality."""

    def test_extraction_prompt_structure(self):
        """Test that extraction prompt has required elements."""
        from main import EXTRACTION_PROMPT

        assert "Extract software requirements" in EXTRACTION_PROMPT
        assert "functional, non-functional" in EXTRACTION_PROMPT
        assert "confidence_score" in EXTRACTION_PROMPT
        assert "Return ONLY valid JSON" in EXTRACTION_PROMPT

    def test_chat_system_prompt(self):
        """Test chat system prompt content."""
        from main import CHAT_SYSTEM_PROMPT

        assert "Fishy" in CHAT_SYSTEM_PROMPT
        assert "software requirements engineering" in CHAT_SYSTEM_PROMPT
        assert "helpful" in CHAT_SYSTEM_PROMPT

    def test_conflict_detection_prompt(self):
        """Test conflict detection prompt structure."""
        from main import CONFLICT_DETECTION_PROMPT

        assert "conflicts or contradictions" in CONFLICT_DETECTION_PROMPT
        assert "direct contradictions" in CONFLICT_DETECTION_PROMPT
        assert "incompatible features" in CONFLICT_DETECTION_PROMPT
        assert "Return ONLY valid JSON" in CONFLICT_DETECTION_PROMPT

    def test_persona_prompt_template(self):
        """Test persona prompt template."""
        from main import PERSONA_PROMPT_TEMPLATE

        assert "{persona_name}" in PERSONA_PROMPT_TEMPLATE
        assert "{requirement_text}" in PERSONA_PROMPT_TEMPLATE
        assert "perspective of a" in PERSONA_PROMPT_TEMPLATE


class TestGroqIntegration:
    """Test actual Groq API integration (mocked)."""

    @patch('langchain_groq.ChatGroq.invoke')
    def test_call_groq_chat_success(self, mock_invoke):
        """Test successful Groq API call."""
        mock_response = MagicMock()
        mock_response.content = "Response text"
        mock_response.additional_kwargs = {'usage': {'total_tokens': 150}}
        mock_invoke.return_value = mock_response

        from main import call_groq_chat

        messages = [{"role": "user", "content": "Test"}]
        response, tokens = call_groq_chat(messages)

        assert response == "Response text"
        assert tokens == 150

    @patch('langchain_groq.ChatGroq.invoke')
    def test_call_groq_chat_error(self, mock_invoke):
        """Test Groq API error handling."""
        from main import call_groq_chat
        import pytest
        from fastapi import HTTPException

        mock_invoke.side_effect = Exception("API Error")

        messages = [{"role": "user", "content": "Test"}]

        with pytest.raises(HTTPException) as exc_info:
            call_groq_chat(messages)

        assert exc_info.value.status_code == 500
        assert "Groq API error" in str(exc_info.value.detail)


class TestRAGIntegration:
    """Test RAG functionality integration."""

    @patch('main._load_rag_artifacts')
    def test_rag_decision_logic(self, mock_load):
        """Test RAG decision making."""
        from main import needs_rag

        # Test with RAG disabled
        result = needs_rag("simple query")
        assert result is False  # RAG is disabled by default in tests

    def test_rag_context_formatting(self):
        """Test RAG context message formatting."""
        from main import _build_rag_context_message

        retrieved = [
            {"text": "Requirement 1", "score": 0.9},
            {"text": "Requirement 2", "score": 0.8}
        ]

        context = _build_rag_context_message(retrieved)

        assert "retrieved context" in context
        assert "Requirement 1" in context
        assert "Requirement 2" in context
        assert "score: 0.9000" in context


class TestPersonaIntegration:
    """Test persona manager integration."""

    def test_persona_manager_import(self):
        """Test persona manager can be imported."""
        from persona_manager import PersonaManager, PersonaProfile

        manager = PersonaManager()
        assert manager.personas == {}

        profile = PersonaProfile(
            id=1,
            name="Test Persona",
            type="custom",
            role="Tester",
            description="Test description",
            priorities=["Quality"],
            concerns=["Bugs"],
            typical_requirements=["Must be testable"],
            communication_style="Direct",
            technical_level="medium",
            focus_areas=["Testing"]
        )

        assert profile.name == "Test Persona"
        assert profile.priorities == ["Quality"]

    def test_persona_prompt_generation(self):
        """Test persona prompt generation."""
        from persona_manager import PersonaManager, PersonaProfile

        manager = PersonaManager()

        profile = PersonaProfile(
            id=1,
            name="Developer",
            type="developer",
            role="Software Developer",
            description="Experienced developer",
            priorities=["Performance", "Scalability"],
            concerns=["Technical debt"],
            typical_requirements=["Must be maintainable"],
            communication_style="Technical",
            technical_level="expert",
            focus_areas=["Architecture", "Code quality"]
        )

        prompt = manager.generate_system_prompt(profile, "generate")

        assert "Software Developer" in prompt
        assert "Performance" in prompt
        assert "Scalability" in prompt
        assert "Technical debt" in prompt