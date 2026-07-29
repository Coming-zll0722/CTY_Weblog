from hashlib import sha256
from io import BytesIO
from pathlib import Path
from uuid import UUID

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError
from app.models import MediaFile
from app.services.storage import get_media_storage

ALLOWED_MEDIA = {
    "image/jpeg": {".jpg", ".jpeg"},
    "image/png": {".png"},
    "image/webp": {".webp"},
    "image/avif": {".avif"},
}


def _detected_mime(body: bytes) -> str | None:
    if body.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if body.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if body.startswith(b"RIFF") and body[8:12] == b"WEBP":
        return "image/webp"
    if len(body) >= 12 and body[4:8] == b"ftyp" and body[8:12] in {b"avif", b"avis"}:
        return "image/avif"
    return None


async def store_image(
    session: AsyncSession,
    file: UploadFile,
    uploader_id: UUID,
    alt_text: str | None,
) -> MediaFile:
    settings = get_settings()
    original_name = Path(file.filename or "upload").name
    extension = Path(original_name).suffix.lower()
    declared_mime = file.content_type or ""
    if declared_mime not in ALLOWED_MEDIA or extension not in ALLOWED_MEDIA[declared_mime]:
        raise AppError(415, "UPLOAD_TYPE_DENIED", "仅支持 JPEG、PNG、WebP 和 AVIF 图片。")
    body = await file.read(settings.max_upload_bytes + 1)
    if len(body) > settings.max_upload_bytes:
        raise AppError(413, "UPLOAD_TOO_LARGE", "图片超过大小限制。")
    detected_mime = _detected_mime(body)
    if detected_mime != declared_mime:
        raise AppError(415, "UPLOAD_TYPE_DENIED", "文件内容与声明类型不一致。")
    width: int | None = None
    height: int | None = None
    try:
        with Image.open(BytesIO(body)) as image:
            image.verify()
        with Image.open(BytesIO(body)) as image:
            image.load()
            width, height = image.size
            if width * height > 40_000_000:
                raise AppError(413, "IMAGE_DIMENSIONS_TOO_LARGE", "图片像素尺寸过大。")
            output = BytesIO()
            if declared_mime == "image/jpeg":
                normalized = image.convert("RGB")
                normalized.save(output, format="JPEG", quality=90, optimize=True)
            elif declared_mime == "image/png":
                image.save(output, format="PNG", optimize=True)
            elif declared_mime == "image/webp":
                image.save(output, format="WEBP", quality=88, method=6)
            else:
                image.save(output, format="AVIF", quality=85)
            body = output.getvalue()
            if len(body) > settings.max_upload_bytes:
                raise AppError(413, "UPLOAD_TOO_LARGE", "处理后的图片超过大小限制。")
    except (Image.DecompressionBombError, UnidentifiedImageError, OSError) as exc:
        raise AppError(415, "UPLOAD_TYPE_DENIED", "图片无法解析。") from exc
    digest = sha256(body).hexdigest()
    existing = await session.scalar(
        select(MediaFile).where(
            MediaFile.checksum == digest,
            MediaFile.deleted_at.is_(None),
        )
    )
    if existing:
        return existing
    try:
        storage_name = get_media_storage().store(body, extension)
    except ValueError:
        raise AppError(400, "INVALID_UPLOAD_PATH", "上传路径无效。")

    media = MediaFile(
        storage_key=storage_name,
        original_name=original_name,
        mime_type=detected_mime,
        size_bytes=len(body),
        width=width,
        height=height,
        alt_text=alt_text,
        checksum=digest,
        uploader_id=uploader_id,
    )
    session.add(media)
    await session.commit()
    await session.refresh(media)
    return media
