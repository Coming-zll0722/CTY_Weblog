from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import admin_user, csrf_protected, current_user
from app.core.config import get_settings
from app.core.security import create_access_token, create_csrf_token
from app.db.session import get_session
from app.models import User
from app.schemas.auth import LoginRequest, PasswordChange, UserRead
from app.schemas.common import ApiResponse
from app.services.auth import authenticate, change_password

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login")
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    client_host = request.client.host if request.client else "unknown"
    user = await authenticate(session, payload.email, payload.password, client_host)
    settings = get_settings()
    csrf_token = create_csrf_token()
    response.set_cookie(
        settings.session_cookie_name,
        create_access_token(str(user.id), user.role, user.token_version),
        max_age=settings.access_token_minutes * 60,
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        settings.csrf_cookie_name,
        csrf_token,
        max_age=settings.access_token_minutes * 60,
        httponly=False,
        secure=settings.secure_cookies,
        samesite="lax",
        path="/",
    )
    return ApiResponse(data={"user": UserRead.model_validate(user), "csrf_token": csrf_token})


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(csrf_protected)],
)
async def logout(
    response: Response,
    _user: User = Depends(current_user),
) -> None:
    settings = get_settings()
    response.delete_cookie(settings.session_cookie_name, path="/")
    response.delete_cookie(settings.csrf_cookie_name, path="/")


@router.get("/me")
async def me(user: User = Depends(current_user)) -> ApiResponse[UserRead]:
    return ApiResponse(data=UserRead.model_validate(user))


@router.post(
    "/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(csrf_protected)],
)
async def update_password(
    payload: PasswordChange,
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    await change_password(session, user, payload.current_password, payload.new_password)
