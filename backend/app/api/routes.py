from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app.core.config import get_settings
from app.schemas.common import ApiResponse, PageMeta, PageResponse
from app.schemas.post import PostCreate

router = APIRouter()

DEMO_POSTS = [
    {
        "id": "11111111-1111-4111-8111-111111111111",
        "title": "从协议分析到自动化执行",
        "slug": "tcp-udp-test-platform-design",
        "summary": "网络测试工具的设计方法。",
        "content_md": "# 示例正文",
        "status": "published",
        "published_at": "2026-07-18T00:00:00Z",
        "updated_at": "2026-07-21T00:00:00Z",
    }
]


@router.get("/health")
async def health() -> ApiResponse[dict[str, str]]:
    return ApiResponse(data={"status": "ok"})


@router.post("/auth/login")
async def login() -> ApiResponse[dict[str, str]]:
    raise HTTPException(status_code=501, detail="Connect the database before enabling login.")


@router.get("/posts")
async def list_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, max_length=100),
) -> PageResponse[dict]:
    items = DEMO_POSTS
    if q:
        items = [item for item in items if q.lower() in item["title"].lower()]
    return PageResponse(data=items, meta=PageMeta(page=page, page_size=page_size, total=len(items)))


@router.get("/posts/{slug}")
async def get_post(slug: str) -> ApiResponse[dict]:
    post = next((item for item in DEMO_POSTS if item["slug"] == slug), None)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return ApiResponse(data=post)


@router.post("/admin/posts", status_code=status.HTTP_201_CREATED)
async def create_post(payload: PostCreate) -> ApiResponse[dict]:
    raise HTTPException(status_code=501, detail=f"Persistence required for {payload.slug}.")


@router.patch("/admin/posts/{post_id}")
async def update_post(post_id: UUID) -> ApiResponse[dict]:
    raise HTTPException(status_code=501, detail=f"Persistence required for {post_id}.")


@router.delete("/admin/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(post_id: UUID) -> None:
    raise HTTPException(status_code=501, detail=f"Persistence required for {post_id}.")


@router.get("/projects")
async def list_projects() -> PageResponse[dict]:
    return PageResponse(data=[], meta=PageMeta(page=1, page_size=20, total=0))


@router.get("/timelines")
async def list_timeline() -> ApiResponse[list[dict]]:
    return ApiResponse(data=[])


@router.get("/search")
async def search(q: str = Query(min_length=1, max_length=100)) -> ApiResponse[dict]:
    matches = [item for item in DEMO_POSTS if q.lower() in item["title"].lower()]
    return ApiResponse(data={"query": q, "items": matches})


@router.post("/admin/media", status_code=status.HTTP_201_CREATED)
async def upload_media(file: UploadFile = File(...)) -> ApiResponse[dict]:
    settings = get_settings()
    if file.content_type not in {"image/jpeg", "image/png", "image/webp", "image/avif"}:
        raise HTTPException(status_code=415, detail="Unsupported media type")
    body = await file.read(settings.max_upload_bytes + 1)
    if len(body) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="File too large")
    return ApiResponse(data={"filename": file.filename or "upload", "size": len(body)})


@router.get("/settings/public")
async def public_settings() -> ApiResponse[dict]:
    return ApiResponse(data={"site_name": "林序 · 工程笔记"})


@router.post("/analytics/views", status_code=status.HTTP_202_ACCEPTED)
async def record_view() -> ApiResponse[dict[str, bool]]:
    return ApiResponse(data={"accepted": True})


@router.get("/admin/analytics/overview")
async def analytics_overview() -> ApiResponse[dict[str, int]]:
    return ApiResponse(data={"views": 0, "visitors": 0})


@router.post("/admin/backups", status_code=status.HTTP_202_ACCEPTED)
async def create_backup() -> ApiResponse[dict[str, str]]:
    return ApiResponse(data={"status": "queued"})
