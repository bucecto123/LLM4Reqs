
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app, StoryGraphRequest

# We need to make sure the import in main.py works or we mock it.
# main.py imports ChatGroq which might fail if api key is missing.
# conftest.py usually handles client creation.

class TestStoryGraphEndpoint:
    
    @patch('main.chat_model_low_temp')
    def test_generate_story_graph_success(self, mock_chat_model, client):
        # Mock LLM response with valid strict JSON
        mock_content = """
        ```json
        {
          "meta": {
            "title": "E-Commerce MVP",
            "goal": "Launch online store",
            "product": "ShopifyClone"
          },
          "activities": [
            {"id": "act1", "name": "User Management", "order": 1},
            {"id": "act2", "name": "Shopping", "order": 2}
          ],
          "tasks": [
            {"id": "tsk1", "name": "Registration", "order": 1, "priority": "must"},
            {"id": "tsk2", "name": "Browse Items", "order": 2, "priority": "should"}
          ],
          "userStories": [
            {"id": "us1", "activityId": "act1", "taskId": "tsk1", "text": "As a user I want to register", "priority": "mvp"},
            {"id": "us2", "activityId": "act2", "taskId": "tsk2", "text": "As a user I want to view products", "priority": "next"}
          ]
        }
        ```
        """
        mock_response = MagicMock()
        mock_response.content = mock_content
        
        # Configure the mock to return valid response when invoke is called
        mock_chat_model.invoke.return_value = mock_response

        payload = {
            "project_id": 123,
            "project_name": "Test Project",
            "requirements": [
                {"title": "Req 1", "type": "Functional", "priority": "High", "text": "Users must register"}
            ],
            "chat_context": "Previous discussion about registration flow."
        }
        
        # Note: client comes from conftest, verifying route
        response = client.post("/api/story-graph/generate", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "graph TD" in data["mermaid_code"]
        assert data["story_map"]["meta"]["title"] == "E-Commerce MVP"
        assert len(data["nodes"]) > 0
        
        # Verify prompts invocation
        mock_chat_model.invoke.assert_called_once()
        args, _ = mock_chat_model.invoke.call_args
        prompt_sent = args[0][0].content
        assert "Additional Context from Chat" in prompt_sent
        assert "Previous discussion about registration flow" in prompt_sent

    def test_generate_story_graph_no_requirements(self, client):
        payload = {
            "project_id": 123,
            "project_name": "Empty Project",
            "requirements": []
        }
        response = client.post("/api/story-graph/generate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "No Requirements" in data["mermaid_code"]  

