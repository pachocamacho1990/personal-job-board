from abc import ABC, abstractmethod
from typing import Any

class LLMProvider(ABC):
    @abstractmethod
    def get_chat_model(self) -> Any:
        """Returns a LangChain-compatible chat model instance."""
        pass
