from collections import defaultdict, deque
from datetime import UTC, datetime
from time import monotonic

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.security import hash_password, verify_password
from app.models import OperationLog, User

_attempts: dict[str, deque[float]] = defaultdict(deque)
_dummy_password_hash = hash_password("not-a-real-account-password")


def _check_rate_limit(key: str) -> None:
    settings = get_settings()
    now = monotonic()
    bucket = _attempts[key]
    while bucket and now - bucket[0] > settings.login_window_seconds:
        bucket.popleft()
    if len(bucket) >= settings.login_attempt_limit:
        raise AppError(429, "RATE_LIMITED", "登录尝试过多，请稍后再试。")


def _record_failed_attempt(*keys: str) -> None:
    now = monotonic()
    for key in keys:
        _attempts[key].append(now)
    if len(_attempts) > 10_000:
        cutoff = now - get_settings().login_window_seconds
        stale = [
            key
            for key, bucket in _attempts.items()
            if not bucket or bucket[-1] < cutoff
        ]
        for key in stale:
            _attempts.pop(key, None)


async def authenticate(
    session: AsyncSession, email: str, password: str, client_key: str
) -> User:
    normalized_email = email.strip().lower()
    client_limiter_key = f"client:{client_key}"
    account_limiter_key = f"account:{normalized_email}"
    _check_rate_limit(client_limiter_key)
    _check_rate_limit(account_limiter_key)
    user = await session.scalar(
        select(User).where(
            func.lower(User.email) == normalized_email,
            User.is_active.is_(True),
            User.deleted_at.is_(None),
        )
    )
    password_valid = verify_password(
        password,
        user.password_hash if user else _dummy_password_hash,
    )
    if not user or not password_valid:
        _record_failed_attempt(client_limiter_key, account_limiter_key)
        raise AppError(401, "INVALID_CREDENTIALS", "邮箱或密码错误。")
    _attempts.pop(client_limiter_key, None)
    _attempts.pop(account_limiter_key, None)
    user.last_login_at = datetime.now(UTC)
    session.add(
        OperationLog(
            actor_id=user.id,
            action="auth.login",
            resource_type="user",
            resource_id=user.id,
            detail_json={},
        )
    )
    await session.commit()
    return user


async def change_password(
    session: AsyncSession,
    user: User,
    current_password: str,
    new_password: str,
) -> None:
    if not verify_password(current_password, user.password_hash):
        raise AppError(401, "INVALID_CREDENTIALS", "当前密码错误。")
    user.password_hash = hash_password(new_password)
    user.token_version += 1
    session.add(
        OperationLog(
            actor_id=user.id,
            action="auth.password_changed",
            resource_type="user",
            resource_id=user.id,
            detail_json={},
        )
    )
    await session.commit()
