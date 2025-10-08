import json
import importlib.util
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


def load_main_module():
    # Load llm/main.py as a module regardless of package layout
    repo_root = Path(__file__).resolve().parent.parent
    main_path = repo_root / "main.py"
    spec = importlib.util.spec_from_file_location("llm_main", str(main_path))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_parse_json_response_with_code_block():
    main = load_main_module()
    content = "```json\n{\"requirements\":[{\"requirement_text\":\"X\",\"requirement_type\":\"functional\",\"priority\":\"high\",\"confidence_score\":0.9}]}\n```"
    parsed = main.parse_json_response(content)
    assert "requirements" in parsed
    assert isinstance(parsed["requirements"], list)


def test_health_endpoint():
    main = load_main_module()
    client = TestClient(main.app)
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "healthy"
    assert "model" in data


def test_chat_endpoint_monkeypatched(monkeypatch):
    main = load_main_module()

    def fake_call_groq_chat(messages, max_tokens=1000, temperature=0.7):
        return ("Hello from fake groq", 7)

    monkeypatch.setattr(main, "call_groq_chat", fake_call_groq_chat)

    client = TestClient(main.app)
    resp = client.post("/api/chat", json={"message": "hi", "conversation_history": [], "context": None})
    assert resp.status_code == 200
    data = resp.json()
    assert data["response"] == "Hello from fake groq"
    assert data["tokens_used"] == 7


def test_extract_endpoint_parses_requirements(monkeypatch):
    main = load_main_module()

    example_json = json.dumps({
        "requirements": [
            {
                "requirement_text": "The system must do X",
                "requirement_type": "functional",
                "priority": "high",
                "confidence_score": 0.9,
            }
        ]
    })

    def fake_call_groq_chat(messages, max_tokens=1000, temperature=0.3):
        return (example_json, 12)

    monkeypatch.setattr(main, "call_groq_chat", fake_call_groq_chat)

    client = TestClient(main.app)
    resp = client.post("/api/extract", json={"text": "Some input text"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_extracted"] == 1
    reqs = data["requirements"]
    assert reqs[0]["requirement_text"] == "The system must do X"


def test_conflicts_detection_monkeypatched(monkeypatch):
    main = load_main_module()

    conflicts_json = json.dumps({
        "conflicts": [
            {
                "requirement_id_1": 1,
                "requirement_id_2": 2,
                "conflict_description": "Contradiction",
                "severity": "high",
            }
        ]
    })

    def fake_call_groq_chat(messages, max_tokens=1000, temperature=0.3):
        return (conflicts_json, 8)

    monkeypatch.setattr(main, "call_groq_chat", fake_call_groq_chat)

    client = TestClient(main.app)
    reqs = [{"id": 1, "text": "A"}, {"id": 2, "text": "B"}]
    resp = client.post("/api/conflicts/detect", json={"requirements": reqs})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_conflicts"] == 1
    assert data["conflicts"][0]["conflict_description"] == "Contradiction"
