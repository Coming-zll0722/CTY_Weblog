#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# shellcheck source=common.sh
source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)/common.sh"

backup_input="${1:-}"
if [[ -z "${backup_input}" ]]; then
  echo "Usage: restore-isolated.sh /absolute/path/to/backup.dump" >&2
  exit 1
fi

backup_path="$(realpath -- "${backup_input}")"
backup_root="$(realpath -- "${PROJECT_ROOT}/var/backups")"
if [[ "${backup_path}" != "${backup_root}/"* || ! -s "${backup_path}" ]]; then
  echo "Backup must be a non-empty file under ${backup_root}." >&2
  exit 1
fi
if [[ -f "${backup_path}.sha256" ]]; then
  (cd "$(dirname -- "${backup_path}")" && sha256sum --check "$(basename -- "${backup_path}.sha256")")
fi

restore_id="$(date -u +%Y%m%dT%H%M%SZ)-${RANDOM}"
container_name="engineering-notes-restore-${restore_id}"
volume_name="engineering-notes-restore-${restore_id}"
restore_password="$(openssl rand -hex 24)"

cleanup() {
  if [[ "${container_name}" == engineering-notes-restore-* ]]; then
    docker rm --force "${container_name}" >/dev/null 2>&1 || true
  fi
  if [[ "${volume_name}" == engineering-notes-restore-* ]]; then
    docker volume rm "${volume_name}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

docker volume create "${volume_name}" >/dev/null
docker run --detach --name "${container_name}" \
  --network none \
  --mount "type=volume,source=${volume_name},target=/var/lib/postgresql/data" \
  --env POSTGRES_DB=restore_validation \
  --env POSTGRES_USER=restore_validation \
  --env "POSTGRES_PASSWORD=${restore_password}" \
  postgres:16-alpine >/dev/null

for _attempt in $(seq 1 30); do
  if docker exec "${container_name}" \
    pg_isready --username restore_validation --dbname restore_validation >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "${container_name}" \
  pg_isready --username restore_validation --dbname restore_validation >/dev/null

docker exec --interactive "${container_name}" \
  pg_restore --username restore_validation --dbname restore_validation \
  --no-owner --no-privileges --exit-on-error < "${backup_path}"

version="$(
  docker exec "${container_name}" \
    psql --username restore_validation --dbname restore_validation \
    --tuples-only --no-align --command "SELECT version_num FROM alembic_version"
)"
table_count="$(
  docker exec "${container_name}" \
    psql --username restore_validation --dbname restore_validation \
    --tuples-only --no-align --command \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
)"

echo "Isolated restore passed: alembic=${version}, public_tables=${table_count}."
