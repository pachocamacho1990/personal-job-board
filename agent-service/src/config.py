import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # PostgreSQL Connection String
    database_url: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://jobboard_user:jobboard_secure_password_2024@postgres:5432/jobboard"
    )
    
    # JWT signing key (shares value with Express backend)
    jwt_secret: str = os.getenv("JWT_SECRET", "")
    
    # OpenAI-compatible LLM Cloud configurations
    llm_base_url: str = os.getenv("LLM_BASE_URL", "")
    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    llm_model: str = os.getenv("LLM_MODEL", "minimax-m2.7:cloud")
    
    # Internal URL for Express API
    express_api_url: str = os.getenv("EXPRESS_API_URL", "http://api:3000/api")
    
    # Test Mode for deterministic mock responses in tests
    test_mode: bool = os.getenv("TEST_MODE", "false").lower() == "true"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
