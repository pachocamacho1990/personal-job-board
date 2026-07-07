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
