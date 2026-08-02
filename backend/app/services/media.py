import asyncio
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
    try:
        body, width, height = await asyncio.to_thread(
            _normalize_image, body, declared_mime, settings.max_upload_bytes
        )
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
        storage = get_media_storage()
        storage_name = await asyncio.to_thread(storage.store, body, extension)
        await asyncio.to_thread(_write_variants, storage, storage_name, body, width)
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


def _normalize_image(body: bytes, mime_type: str, max_bytes: int) -> tuple[bytes, int, int]:
    with Image.open(BytesIO(body)) as image:
        image.verify()
    with Image.open(BytesIO(body)) as image:
        image.load()
        width, height = image.size
        if width * height > 40_000_000:
            raise AppError(413, "IMAGE_DIMENSIONS_TOO_LARGE", "图片像素尺寸过大。")
        output = BytesIO()
        if mime_type == "image/jpeg":
            image.convert("RGB").save(output, format="JPEG", quality=88, optimize=True)
        elif mime_type == "image/png":
            image.save(output, format="PNG", optimize=True)
        elif mime_type == "image/webp":
            image.save(output, format="WEBP", quality=86, method=6)
        else:
            image.save(output, format="AVIF", quality=82)
        normalized = output.getvalue()
        if len(normalized) > max_bytes:
            raise AppError(413, "UPLOAD_TOO_LARGE", "处理后的图片超过大小限制。")
        return normalized, width, height


def _write_variants(storage, storage_key: str, body: bytes, source_width: int) -> None:
    for target_width in (480, 960, 1440):
        if target_width >= source_width:
            continue
        for extension, image_format in ((".webp", "WEBP"), (".avif", "AVIF")):
            try:
                variant = _resize_image(body, target_width, image_format)
                storage.store_variant(storage_key, variant, target_width, extension)
            except OSError:
                # Some Pillow builds do not include AVIF; WebP remains available.
                continue


def _resize_image(body: bytes, width: int, image_format: str) -> bytes:
    with Image.open(BytesIO(body)) as image:
        image.load()
        if image.width <= width:
            return body
        height = max(1, round(image.height * width / image.width))
        resized = image.convert("RGB").resize((width, height), Image.Resampling.LANCZOS)
        output = BytesIO()
        options = (
            {"quality": 82, "method": 6}
            if image_format == "WEBP"
            else {"quality": 78}
        )
        resized.save(output, format=image_format, **options)
        return output.getvalue()


async def ensure_variant(
    storage_key: str,
    source: Path,
    width: int,
    image_format: str,
) -> Path | None:
    storage = get_media_storage()
    extension = f".{image_format}"
    existing = storage.resolve_variant(storage_key, width, extension)
    if existing:
        return existing

    def create() -> Path | None:
        try:
            variant = _resize_image(source.read_bytes(), width, image_format.upper())
            variant_key = storage.store_variant(storage_key, variant, width, extension)
            return storage.resolve(variant_key)
        except (OSError, ValueError):
            return None

    return await asyncio.to_thread(create)
