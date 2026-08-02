from pathlib import Path
from typing import Protocol
from uuid import uuid4

from app.core.config import get_settings


class MediaStorage(Protocol):
    """Boundary implemented by local volumes today and S3/R2 adapters later."""

    def store(self, body: bytes, extension: str) -> str: ...

    def resolve(self, storage_key: str) -> Path | None: ...

    def store_variant(
        self, storage_key: str, body: bytes, width: int, extension: str
    ) -> str: ...

    def resolve_variant(
        self, storage_key: str, width: int, extension: str
    ) -> Path | None: ...


class LocalMediaStorage:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()

    def store(self, body: bytes, extension: str) -> str:
        self.root.mkdir(parents=True, exist_ok=True)
        storage_key = f"{uuid4().hex}{extension}"
        destination = (self.root / storage_key).resolve()
        if self.root not in destination.parents:
            raise ValueError("invalid storage path")
        destination.write_bytes(body)
        return storage_key

    def resolve(self, storage_key: str) -> Path | None:
        if Path(storage_key).name != storage_key:
            return None
        source = (self.root / storage_key).resolve()
        if self.root not in source.parents or not source.is_file():
            return None
        return source

    def store_variant(
        self, storage_key: str, body: bytes, width: int, extension: str
    ) -> str:
        variant_key = self._variant_key(storage_key, width, extension)
        destination = (self.root / variant_key).resolve()
        if self.root not in destination.parents:
            raise ValueError("invalid storage path")
        destination.write_bytes(body)
        return variant_key

    def resolve_variant(
        self, storage_key: str, width: int, extension: str
    ) -> Path | None:
        return self.resolve(self._variant_key(storage_key, width, extension))

    @staticmethod
    def _variant_key(storage_key: str, width: int, extension: str) -> str:
        if Path(storage_key).name != storage_key or extension not in {".webp", ".avif"}:
            raise ValueError("invalid variant path")
        return f"{Path(storage_key).stem}-{width}w{extension}"


def get_media_storage() -> MediaStorage:
    return LocalMediaStorage(get_settings().upload_root)
