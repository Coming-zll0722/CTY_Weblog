"""Verify migrations plus backup/restore on an isolated PostgreSQL cluster."""

import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def postgres_bin() -> Path:
    configured = os.environ.get("POSTGRES_BIN")
    candidates = [
        Path(configured) if configured else None,
        Path("E:/PostgreSQL/bin"),
        Path("/usr/lib/postgresql/18/bin"),
        Path("/usr/lib/postgresql/17/bin"),
        Path("/usr/lib/postgresql/16/bin"),
    ]
    discovered = shutil.which("initdb")
    if discovered:
        candidates.insert(0, Path(discovered).parent)
    for candidate in candidates:
        if candidate and (candidate / executable("initdb")).is_file():
            return candidate.resolve()
    raise RuntimeError("PostgreSQL initdb/pg_ctl tools were not found; set POSTGRES_BIN")


def executable(name: str) -> str:
    return f"{name}.exe" if os.name == "nt" else name


def free_port() -> int:
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return int(listener.getsockname()[1])


def run(
    command: list[str],
    *,
    environment: dict[str, str] | None = None,
    capture: bool = True,
) -> str:
    hidden = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    result = subprocess.run(
        command,
        cwd=BACKEND_ROOT,
        env=environment,
        check=True,
        stdout=subprocess.PIPE if capture else subprocess.DEVNULL,
        stderr=subprocess.PIPE if capture else subprocess.DEVNULL,
        text=True,
        creationflags=hidden,
    )
    return result.stdout.strip() if result.stdout else ""


def remove_temporary(path: Path) -> None:
    for _attempt in range(12):
        if not path.exists():
            return
        try:
            shutil.rmtree(path)
            return
        except PermissionError:
            time.sleep(0.25)
    raise RuntimeError(f"could not remove PostgreSQL smoke directory: {path}")


def main() -> None:
    binary_root = postgres_bin()
    temporary = Path(tempfile.mkdtemp(prefix="engineering-notes-postgres-")).resolve()
    data = temporary / "data"
    log = temporary / "postgres.log"
    port = free_port()
    pg_ctl = str(binary_root / executable("pg_ctl"))
    started = False
    try:
        run(
            [
                str(binary_root / executable("initdb")),
                "--pgdata",
                str(data),
                "--username",
                "postgres",
                "--auth",
                "trust",
                "--no-locale",
            ]
        )
        run(
            [
                pg_ctl,
                "--pgdata",
                str(data),
                "--log",
                str(log),
                "--options",
                f"-p {port} -h 127.0.0.1",
                "--wait",
                "start",
            ],
            capture=False,
        )
        started = True
        run(
            [
                str(binary_root / executable("createdb")),
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
                "--username",
                "postgres",
                "engineering_notes",
            ]
        )
        environment = os.environ.copy()
        environment.update(
            {
                "DATABASE_URL": (
                    f"postgresql+asyncpg://postgres@127.0.0.1:{port}/engineering_notes"
                ),
                "SECRET_KEY": "postgres-migration-smoke-secret-32-bytes",
            }
        )
        run([sys.executable, "-m", "alembic", "upgrade", "head"], environment=environment)
        version = run(
            [
                str(binary_root / executable("psql")),
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
                "--username",
                "postgres",
                "--dbname",
                "engineering_notes",
                "--tuples-only",
                "--no-align",
                "--command",
                (
                    "SELECT version_num FROM alembic_version "
                    "WHERE to_regclass('public.project_media') IS NOT NULL"
                ),
            ]
        )
        if version != "20260728_04":
            raise RuntimeError(f"unexpected migration version: {version!r}")

        backup_file = temporary / "engineering-notes.dump"
        run(
            [
                str(binary_root / executable("pg_dump")),
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
                "--username",
                "postgres",
                "--dbname",
                "engineering_notes",
                "--format",
                "custom",
                "--file",
                str(backup_file),
            ]
        )
        if not backup_file.is_file() or backup_file.stat().st_size == 0:
            raise RuntimeError("pg_dump did not create a backup artifact")
        run(
            [
                str(binary_root / executable("createdb")),
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
                "--username",
                "postgres",
                "engineering_notes_restore",
            ]
        )
        run(
            [
                str(binary_root / executable("pg_restore")),
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
                "--username",
                "postgres",
                "--dbname",
                "engineering_notes_restore",
                "--no-owner",
                str(backup_file),
            ]
        )
        restored_version = run(
            [
                str(binary_root / executable("psql")),
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
                "--username",
                "postgres",
                "--dbname",
                "engineering_notes_restore",
                "--tuples-only",
                "--no-align",
                "--command",
                "SELECT version_num FROM alembic_version",
            ]
        )
        if restored_version != version:
            raise RuntimeError(
                f"restored migration version mismatch: {restored_version!r}"
            )
        print("isolated PostgreSQL migration and backup restore: passed")
    finally:
        if started:
            try:
                run([pg_ctl, "--pgdata", str(data), "--wait", "--mode", "fast", "stop"])
            except subprocess.CalledProcessError:
                run([pg_ctl, "--pgdata", str(data), "--wait", "--mode", "immediate", "stop"])
        remove_temporary(temporary)


if __name__ == "__main__":
    main()
