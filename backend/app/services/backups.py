import asyncio
import os
import subprocess
from datetime import UTC, datetime
from hashlib import sha256
from uuid import UUID, uuid4

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError
from app.models import Backup


def _postgres_command(
    executable: str,
    database_url: str,
) -> tuple[list[str], dict[str, str]]:
    url = make_url(database_url)
    if not url.drivername.startswith("postgresql"):
        raise AppError(409, "BACKUP_UNSUPPORTED", "备份仅支持 PostgreSQL。")
    command = [executable]
    if url.host:
        command.extend(["--host", url.host])
    if url.port:
        command.extend(["--port", str(url.port)])
    if url.username:
        command.extend(["--username", url.username])
    command.extend(["--dbname", url.database or ""])
    environment = os.environ.copy()
    if url.password:
        environment["PGPASSWORD"] = url.password
    return command, environment


def _file_sha256(path: os.PathLike[str]) -> str:
    digest = sha256()
    with open(path, "rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _run(command: list[str], environment: dict[str, str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        command,
        env=environment,
        capture_output=True,
        check=False,
        timeout=1800,
    )


async def create_database_backup(
    session: AsyncSession, actor_id: UUID
) -> Backup:
    settings = get_settings()
    root = settings.backup_root.resolve()
    root.mkdir(parents=True, exist_ok=True)
    storage_name = f"engineering-notes-{datetime.now(UTC):%Y%m%dT%H%M%SZ}-{uuid4().hex[:8]}.dump"
    destination = (root / storage_name).resolve()
    if root not in destination.parents:
        raise AppError(400, "INVALID_BACKUP_PATH", "备份路径无效。")
    backup = Backup(status="running", storage_key=storage_name, started_by=actor_id)
    session.add(backup)
    await session.commit()
    await session.refresh(backup)
    command, environment = _postgres_command(
        settings.pg_dump_path,
        settings.database_url,
    )
    command.extend(["--format=custom", "--no-owner", "--file", str(destination)])
    try:
        result = await asyncio.to_thread(_run, command, environment)
        if result.returncode != 0:
            raise RuntimeError("pg_dump failed")
        backup.status = "completed"
        backup.size_bytes = destination.stat().st_size
        backup.checksum = _file_sha256(destination)
        backup.completed_at = datetime.now(UTC)
    except (OSError, RuntimeError, subprocess.SubprocessError) as exc:
        backup.status = "failed"
        backup.error_message = type(exc).__name__
        if destination.exists():
            destination.unlink()
    await session.commit()
    await session.refresh(backup)
    if backup.status != "completed":
        raise AppError(503, "BACKUP_FAILED", "数据库备份失败，请检查 PostgreSQL 工具。")
    return backup


async def restore_database_backup(backup: Backup) -> None:
    settings = get_settings()
    if not settings.restore_database_url:
        raise AppError(
            409,
            "RESTORE_TARGET_REQUIRED",
            "未配置隔离恢复数据库；生产数据库不会被直接覆盖。",
        )
    source_url = make_url(settings.database_url)
    target_url = make_url(settings.restore_database_url)
    if (
        source_url.host,
        source_url.port,
        source_url.database,
    ) == (
        target_url.host,
        target_url.port,
        target_url.database,
    ):
        raise AppError(
            409,
            "RESTORE_TARGET_NOT_ISOLATED",
            "恢复目标必须是独立数据库。",
        )
    root = settings.backup_root.resolve()
    source = (root / (backup.storage_key or "")).resolve()
    if root not in source.parents or not source.is_file():
        raise AppError(404, "BACKUP_FILE_NOT_FOUND", "备份文件不存在。")
    if _file_sha256(source) != backup.checksum:
        raise AppError(409, "BACKUP_CHECKSUM_MISMATCH", "备份校验失败。")
    command, environment = _postgres_command(
        settings.pg_restore_path,
        settings.restore_database_url,
    )
    command.extend(
        [
            "--clean",
            "--if-exists",
            "--no-owner",
            "--no-privileges",
            "--exit-on-error",
            "--single-transaction",
            str(source),
        ]
    )
    result = await asyncio.to_thread(_run, command, environment)
    if result.returncode != 0:
        raise AppError(503, "RESTORE_FAILED", "数据库恢复失败。")
