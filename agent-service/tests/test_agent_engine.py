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
