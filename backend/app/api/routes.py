from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import auth, content, management
from app.db.session import get_session
from app.repositories.management import ManagementRepository
from app.schemas.common import ApiResponse
from app.services.content_cache import public_content_cache

router = APIRouter()
router.include_router(auth.router)
router.include_router(content.router)
router.include_router(content.admin_router)
router.include_router(management.public_router)
router.include_router(management.admin_router)


@router.get("/health", tags=["system"])
async def health(
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict[str, str]]:
    await session.execute(text("SELECT 1"))
    return ApiResponse(data={"status": "ok", "database": "ok"})


@router.get("/settings/public", tags=["settings"])
async def public_settings(
    session: AsyncSession = Depends(get_session),
) -> ApiResponse[dict]:
    async def load() -> ApiResponse[dict]:
        values = await ManagementRepository(session).public_settings()
        return ApiResponse(data=values)

    return await public_content_cache.get_or_create(("public-settings",), load)
