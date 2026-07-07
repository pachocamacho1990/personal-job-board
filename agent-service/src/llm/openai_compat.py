from langchain_openai import ChatOpenAI
from .provider import LLMProvider
import os

class OpenAICompatibleProvider(LLMProvider):
    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        model_name: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 4096,
    ):
        self.base_url = base_url or os.getenv("MODEL_BASE_URL") or os.getenv("LLM_BASE_URL")
        self.api_key = api_key or os.getenv("MODEL_API_KEY") or os.getenv("LLM_API_KEY", "mock-key")
        self.model_name = model_name or os.getenv("MODEL_NAME") or os.getenv("LLM_MODEL", "minimax-m2.7:cloud")
        self.temperature = float(os.getenv("MODEL_TEMPERATURE", temperature))
        self.max_tokens = int(os.getenv("MODEL_MAX_TOKENS", max_tokens))

    def get_chat_model(self) -> ChatOpenAI:
        # Standard ChatOpenAI initialization compatible with custom OpenAI-like base URL
        return ChatOpenAI(
            base_url=self.base_url,
            api_key=self.api_key,
            model=self.model_name,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
        )
