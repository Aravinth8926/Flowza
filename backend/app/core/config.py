import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import List

env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.env"))

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./flowza.db"
    SECRET_KEY: str = "flowza-very-secret-signing-key-for-development-purposes"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"

    model_config = ConfigDict(
        env_file=env_path if os.path.exists(env_path) else ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()
