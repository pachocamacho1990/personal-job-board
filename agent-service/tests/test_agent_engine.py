import os
import pytest
from src.agent.state import TaskState
from src.agent.guards import SafetyGuards

def test_task_state_serialization(tmp_path):
    state = TaskState(
        goal="Test goal",
        history=[{"step": 1, "action": "navigate", "result": "ok"}],
        collected_data=[{"title": "Job Title", "salary": "$100k"}],
        cursor={"page": 2, "index": 5}
    )
    
    file_path = str(tmp_path / "task_state.json")
    state.save_to_disk(file_path)
    
    assert os.path.exists(file_path)
    
    loaded_state = TaskState.load_from_disk(file_path)
    assert loaded_state.goal == "Test goal"
    assert len(loaded_state.history) == 1
    assert loaded_state.history[0]["action"] == "navigate"
    assert loaded_state.collected_data[0]["title"] == "Job Title"
    assert loaded_state.cursor["page"] == 2
    assert loaded_state.cursor["index"] == 5

def test_safety_guards_allowed_actions():
    guards = SafetyGuards()
    assert guards.is_allowed_action("click") is True
    assert guards.is_allowed_action("payment") is False
    assert guards.is_allowed_action("delete_account") is False

def test_get_mock_interview_response():
    from src.main import get_mock_interview_response
    
    # 1. First turn: 3 user messages (profile_saved event + start_interview action + chat input)
    history = [
        {"role": "user", "content": "Completar mi perfil"},
        {"role": "user", "content": "Sí, empecemos"},
        {"role": "user", "content": "Busco Senior Software Engineer"}
    ]
    content, tool_calls = get_mock_interview_response(history)
    assert content is not None
    assert "Segunda pregunta" in content
    assert tool_calls is None
    
    # 2. Second turn: 4 user messages
    history = [
        {"role": "user", "content": "Completar mi perfil"},
        {"role": "user", "content": "Sí, empecemos"},
        {"role": "user", "content": "Busco Senior Software Engineer"},
        {"role": "agent", "content": "Segunda pregunta..."},
        {"role": "user", "content": "Mi rango es 100k y remoto"}
    ]
    content, tool_calls = get_mock_interview_response(history)
    assert content is not None
    assert "Última pregunta" in content
    assert tool_calls is None
    
    # 3. Third turn: 5 user messages
    history = [
        {"role": "user", "content": "Completar mi perfil"},
        {"role": "user", "content": "Sí, empecemos"},
        {"role": "user", "content": "Busco Senior Software Engineer"},
        {"role": "agent", "content": "Segunda pregunta..."},
        {"role": "user", "content": "Mi rango es 100k y remoto"},
        {"role": "agent", "content": "Última pregunta..."},
        {"role": "user", "content": "Excluir Acme Corp"}
    ]
    content, tool_calls = get_mock_interview_response(history)
    assert content is None
    assert tool_calls is not None
    assert len(tool_calls) == 1
    assert tool_calls[0].function.name == "save_career_strategy"

def test_copilot_endpoint(monkeypatch):
    from fastapi.testclient import TestClient
    from src.main import app
    from src.db import db_manager
    from src.llm import llm_manager

    # Mock database methods
    async def mock_get_job_by_id(user_id, job_id):
        return {
            "id": job_id,
            "company": "Acme Corp",
            "position": "Backend Developer",
            "location": "Remote",
            "salary": "$120k",
            "comments": "Looking for Python/Node developer"
        }

    async def mock_get_profile_data(user_id):
        return {"full_name": "Test User", "headline": "Software Engineer"}

    async def mock_get_career_strategy(user_id):
        return {
            "career_strategy": {
                "dominant_anchor": "Lifestyle",
                "strategy_summary": "Prioritize remote work and work-life balance."
            }
        }

    async def mock_get_user_memories(user_id):
        return [{"category": "preference", "content": "Prefer Python stacks"}]

    monkeypatch.setattr(db_manager, "get_job_by_id", mock_get_job_by_id)
    monkeypatch.setattr(db_manager, "get_profile_data", mock_get_profile_data)
    monkeypatch.setattr(db_manager, "get_career_strategy", mock_get_career_strategy)
    monkeypatch.setattr(db_manager, "get_user_memories", mock_get_user_memories)

    # Mock LLM manager method
    async def mock_get_response(messages, tools=None):
        return "Mocked Generated Document Content", None

    monkeypatch.setattr(llm_manager, "get_response", mock_get_response)

    client = TestClient(app)
    
    # 1. Test Cover Letter generation
    response = client.post(
        "/copilot",
        json={"user_id": 1, "job_id": 42, "document_type": "cover_letter"}
    )
    assert response.status_code == 200
    assert response.json() == {"content": "Mocked Generated Document Content"}

    # 2. Test Invalid document type
    response = client.post(
        "/copilot",
        json={"user_id": 1, "job_id": 42, "document_type": "invalid_type"}
    )
    assert response.status_code == 400

