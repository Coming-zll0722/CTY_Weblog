import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_production_configuration_rejects_placeholders() -> None:
    with pytest.raises(ValidationError):
        Settings(
            app_env="production",
            database_url="postgresql+asyncpg://blog:change-me@postgres/blog",
            secret_key="replace-with-at-least-32-random-bytes",
            cors_origins=["http://localhost:3000"],
            allowed_hosts=["*"],
        )


def test_production_configuration_accepts_explicit_values() -> None:
    settings = Settings(
        app_env="production",
        database_url="postgresql+asyncpg://blog:nonplaceholder@postgres/blog",
        secret_key="0123456789abcdef0123456789abcdef",
        cors_origins=["https://engineering.example.com"],
        allowed_hosts=["engineering.example.com"],
    )
    assert settings.secure_cookies is True


def test_production_configuration_rejects_live_restore_target() -> None:
    with pytest.raises(ValidationError):
        Settings(
            app_env="production",
            database_url="postgresql+asyncpg://blog:secret@postgres/blog",
            restore_database_url="postgresql+asyncpg://blog:secret@postgres/blog",
            secret_key="0123456789abcdef0123456789abcdef",
            cors_origins=["https://engineering.example.com"],
            allowed_hosts=["engineering.example.com"],
        )
