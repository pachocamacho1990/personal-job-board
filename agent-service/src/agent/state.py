import json
import os
from typing import Any, Dict, List

class TaskState:
    def __init__(
        self,
        goal: str,
        history: List[Dict[str, Any]] = None,
        collected_data: List[Dict[str, Any]] = None,
        cursor: Dict[str, Any] = None,
    ):
        self.goal = goal
        self.history = history or []
        self.collected_data = collected_data or []
        self.cursor = cursor or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "goal": self.goal,
            "history": self.history,
            "collected_data": self.collected_data,
            "cursor": self.cursor,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TaskState":
        return cls(
            goal=data.get("goal", ""),
            history=data.get("history", []),
            collected_data=data.get("collected_data", []),
            cursor=data.get("cursor", {}),
        )

    def save_to_disk(self, file_path: str) -> None:
        directory = os.path.dirname(file_path)
        if directory and not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)

    @classmethod
    def load_from_disk(cls, file_path: str) -> "TaskState":
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"State file not found at {file_path}")
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls.from_dict(data)
