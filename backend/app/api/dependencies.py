from hmac import compare_digest
from uuid import UUID

import jwt
from fastapi import Cookie, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.security import decode_access_token
from app.db.session import get_session
from app.models import User


async def current_user(
    session: AsyncSession = Depends(get_session),
    session_token: str | None = Cookie(default=None, alias=get_settings().session_cookie_name),
) -> User:
    if not session_token:
        raise AppError(401, "AUTH_REQUIRED", "请先登录。")
    try:
        claims = decode_access_token(session_token)
        user_id = UUID(claims["sub"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError) as exc:
        raise AppError(401, "AUTH_REQUIRED", "登录状态已失效。") from exc
    user = await session.get(User, user_id)
    if (
        not user
        or not user.is_active
        or user.deleted_at is not None
        or claims.get("ver") != user.token_version
    ):
        raise AppError(401, "AUTH_REQUIRED", "登录状态已失效。")
    return user


async def admin_user(user: User = Depends(current_user)) -> User:
    if user.role not in {"admin", "super_admin"}:
        raise AppError(403, "FORBIDDEN", "没有管理员权限。")
    return user


async def csrf_protected(
    request: Request,
    csrf_header: str | None = Header(default=None, alias="X-CSRF-Token"),
    csrf_cookie: str | None = Cookie(default=None, alias=get_settings().csrf_cookie_name),
) -> None:
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return
    if not csrf_header or not csrf_cookie or not compare_digest(csrf_header, csrf_cookie):
        raise AppError(403, "CSRF_INVALID", "CSRF 校验失败。")
