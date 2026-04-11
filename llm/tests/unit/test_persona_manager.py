import pytest
from persona_manager import PersonaManager, PersonaProfile

@pytest.fixture
def persona_manager():
    return PersonaManager()

@pytest.fixture
def sample_persona():
    return PersonaProfile(
        id=1,
        name="Test End User",
        type="end_user",
        role="End User",
        description="A typical app user.",
        priorities=["Ease of use", "Speed"],
        concerns=["Complicated flows"],
        typical_requirements=[],
        communication_style="Friendly and direct",
        technical_level="low",
        focus_areas=["UI", "UX"]
    )

def test_load_persona(persona_manager):
    data = {
        "id": 2,
        "name": "Jane",
        "role": "QA Tester",
        "technical_level": "high"
    }
    
    persona = persona_manager.load_persona(data)
    
    assert persona.id == 2
    assert persona.name == "Jane"
    assert persona.role == "QA Tester"
    assert persona.technical_level == "high"
    assert persona_manager.get_persona(2) == persona

def test_infer_task_type(persona_manager):
    assert persona_manager._infer_task_type("Please generate some basic requirements") == "generate"
    assert persona_manager._infer_task_type("Analyze these docs") == "analyze"
    assert persona_manager._infer_task_type("Can you review my acceptance criteria?") == "review"
    assert persona_manager._infer_task_type("Improve this code flow") == "refine"
    assert persona_manager._infer_task_type("Random text") == "generate"

def test_generate_system_prompt(persona_manager, sample_persona):
    prompt = persona_manager.generate_system_prompt(sample_persona, task_type='generate', context="App needs to be fast.")
    
    # Check that basic profile elements are present
    assert "You are a End User" in prompt
    assert "A typical app user." in prompt
    assert "Ease of use" in prompt
    assert "Friendly and direct" in prompt
    assert "App needs to be fast." in prompt
    assert "Generate Requirements" in prompt
