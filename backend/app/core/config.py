from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_env: str = "development"
    app_name: str = "Engineering Notes API"
    api_prefix: str = "/api/v1"
    database_url: str = "postgresql+asyncpg://blog:change-me@localhost:5432/blog"
    secret_key: str = Field(min_length=32, default="development-only-secret-change-me")
    access_token_minutes: int = 30
    cors_origins: list[str] = ["http://localhost:3000"]
    max_upload_bytes: int = 10 * 1024 * 1024
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
