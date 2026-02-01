import pytest
from pydantic import ValidationError
from story_graph import UserStoryMap, StoryPriority, Activity, Task, UserStory, generate_mermaid_chart

class TestUserStoryMap:
    def test_validation_valid_data(self):
        # Valid data
        valid_data = {
            "meta": {"title": "Test Map", "goal": "Testing", "product": "Pro"},
            "activities": [{"id": "act1", "name": "Activity 1", "order": 1}],
            "tasks": [{"id": "tsk1", "name": "Task 1", "order": 1, "priority": "must"}],
            "userStories": [
                {"id": "us1", "activityId": "act1", "taskId": "tsk1", "text": "As a user...", "priority": "mvp"}
            ]
        }
        obj = UserStoryMap(**valid_data)
        assert obj.meta.title == "Test Map"
        assert len(obj.userStories) == 1
        assert obj.tasks[0].priority == "must"
        assert obj.userStories[0].priority == "mvp"

    def test_validation_invalid_enum(self):
        # Invalid priority
        invalid_data = {
            "meta": {"title": "Test Map", "goal": "Testing", "product": "Pro"},
            "activities": [{"id": "act1", "name": "Activity 1", "order": 1}],
            "tasks": [{"id": "tsk1", "name": "Task 1", "order": 1, "priority": "super_urgent"}], # Invalid
            "userStories": []
        }
        with pytest.raises(ValidationError):
            UserStoryMap(**invalid_data)

    def test_validation_missing_field(self):
        invalid_data = {
            "meta": {"title": "Test Map"}, # Missing goal, product
            "activities": [],
            "tasks": [],
            "userStories": []
        }
        with pytest.raises(ValidationError):
            UserStoryMap(**invalid_data)

class TestMermaidGeneration:
    def test_mermaid_generation_structure(self):
        obj = UserStoryMap(
            meta={"title": "Map", "goal": "G", "product": "P"},
            activities=[{"id": "A1", "name": "Act1", "order": 1}],
            tasks=[{"id": "T1", "name": "Task1", "order": 1, "priority": "must"}],
            userStories=[
                {"id": "S1", "activityId": "A1", "taskId": "T1", "text": "Story 1", "priority": "mvp"}
            ]
        )
        mermaid = generate_mermaid_chart(obj)
        
        # Check basic graph definition
        assert "graph TD" in mermaid
        assert "Title[\"Map\"]" in mermaid
        
        # Check Activity
        assert "A1[\"Activity: Act1\"]" in mermaid
        
        # Check Task
        assert "T1[\"Task: Task1\"]" in mermaid
        
        # Check Story
        assert "S1(\"MVP Story 1\")" in mermaid
        
        # Check Links (We know logic: Title -> Act -> Task -> Story)
        # Note: logic might infer Act -> Task from stories
        assert "A1 --> T1" in mermaid
        assert "T1 --> S1" in mermaid

    def test_mermaid_special_characters(self):
        obj = UserStoryMap(
            meta={"title": "Map @ Title", "goal": "G", "product": "P"},
            activities=[{"id": "A1", "name": "Act \"One\"", "order": 1}],
            tasks=[],
            userStories=[]
        )
        mermaid = generate_mermaid_chart(obj)
        # Title should be sanitized in ID but text preserved in quotes (logic is strict alphanumeric for ID)
        # Logic in code: safe_title = re.sub(r'[^a-zA-Z0-9 ]', '', story_map.meta.title)
        assert "Map  Title" in mermaid or "Map Title" in mermaid
