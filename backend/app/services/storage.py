from pathlib import Path
from typing import Protocol
from uuid import uuid4

from app.core.config import get_settings


class MediaStorage(Protocol):
    """Boundary implemented by local volumes today and S3/R2 adapters later."""

    def store(self, body: bytes, extension: str) -> str: ...

    def resolve(self, storage_key: str) -> Path | None: ...


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


def get_media_storage() -> MediaStorage:
    return LocalMediaStorage(get_settings().upload_root)
