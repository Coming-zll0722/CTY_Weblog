from functools import lru_cache
from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_env: str = "development"
    app_name: str = "CTY Log API"
    api_prefix: str = "/api/v1"
    database_url: str = "postgresql+asyncpg://blog:change-me@localhost:5432/blog"
    secret_key: str = Field(min_length=32, default="development-only-secret-change-me")
    access_token_minutes: int = 30
    session_cookie_name: str = "engineering_notes_session"
    csrf_cookie_name: str = "engineering_notes_csrf"
    cors_origins: list[str] = ["http://localhost:3000"]
    allowed_hosts: list[str] = ["localhost", "127.0.0.1", "testserver"]
    max_upload_bytes: int = 10 * 1024 * 1024
    upload_root: Path = Path("var/uploads")
    backup_root: Path = Path("var/backups")
    initial_admin_email: str | None = None
    initial_admin_password: str | None = None
    initial_admin_role: str = "super_admin"
    public_contact_email: str | None = None
    public_github_url: str | None = None
    restore_database_url: str | None = None
    pg_dump_path: str = "pg_dump"
    pg_restore_path: str = "pg_restore"
    login_attempt_limit: int = 5
    login_window_seconds: int = 900
    log_level: str = "INFO"

    @property
    def secure_cookies(self) -> bool:
        return self.app_env == "production"

    @model_validator(mode="after")
    def reject_development_secret_in_production(self) -> "Settings":
        if self.app_env != "production":
            return self
        placeholders = ("development-only", "replace-with", "change-me")
        if any(value in self.secret_key.casefold() for value in placeholders):
            raise ValueError("SECRET_KEY must be replaced in production")
        if any(value in self.database_url.casefold() for value in placeholders):
            raise ValueError("DATABASE_URL must use production credentials")
        if "*" in self.cors_origins or any(
            "localhost" in origin or "127.0.0.1" in origin
            for origin in self.cors_origins
        ):
            raise ValueError("CORS_ORIGINS must contain explicit production origins")
        if "*" in self.allowed_hosts or not self.allowed_hosts:
            raise ValueError("ALLOWED_HOSTS must contain explicit production hosts")
        if self.initial_admin_role not in {"admin", "super_admin"}:
            raise ValueError("INITIAL_ADMIN_ROLE must be admin or super_admin")
        if self.restore_database_url:
            source_database = self.database_url.rsplit("/", 1)[-1]
            restore_database = self.restore_database_url.rsplit("/", 1)[-1]
            if source_database == restore_database:
                raise ValueError("RESTORE_DATABASE_URL must target an isolated database")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
