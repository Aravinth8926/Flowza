import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict, field_validator
from typing import List, Optional

env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.env"))

class Settings(BaseSettings):
    PROJECT_NAME: str = "FLOWZA"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "sqlite+aiosqlite:///./flowza.db"
    SECRET_KEY: str = "flowza-very-secret-signing-key-for-development-purposes"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ENVIRONMENT: str = "development"  # "development", "staging", "production"
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:5174,http://127.0.0.1:5174"

    # AI Configuration
    AI_PROVIDER: str = "gemini"  # "gemini", "openai", "mock"
    AI_MODEL: str = "gpt-4o-mini"
    AI_API_KEY: Optional[str] = None
    AI_BASE_URL: str = "https://api.openai.com/v1"
    AI_TIMEOUT: int = 35
    AI_MAX_TOOL_CALLS: int = 5

    # Google Gemini Multi-Model Fallback Configuration
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODELS: str = "gemini-3.6-flash,gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3-flash-preview,gemini-3.7-flash"

    model_config = ConfigDict(
        env_file=env_path if os.path.exists(env_path) else ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        if not v:
            return "sqlite+aiosqlite:///./flowza.db"
        # Auto-normalize PostgreSQL connection strings for asyncpg
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        if self.FRONTEND_URL and self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL)
        return origins

    @property
    def gemini_models_list(self) -> List[str]:
        return [m.strip() for m in self.GEMINI_MODELS.split(",") if m.strip()]

settings = Settings()
