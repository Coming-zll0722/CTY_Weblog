#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# shellcheck source=common.sh
source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)/common.sh"

if ! "${compose[@]}" ps --status running --services | grep -qx "postgres"; then
  echo "PostgreSQL is not running; no backup was attempted." >&2
  exit 1
fi

backup_root="${PROJECT_ROOT}/var/backups"
mkdir -p "${backup_root}"
chmod 700 "${PROJECT_ROOT}/var" "${backup_root}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="${backup_root}/engineering-notes-${timestamp}.dump"
partial="${destination}.partial"

"${compose[@]}" exec -T postgres \
  pg_dump --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" \
  --format custom --no-owner > "${partial}"

if [[ ! -s "${partial}" ]]; then
  rm -f -- "${partial}"
  echo "Backup output is empty." >&2
  exit 1
fi

mv -- "${partial}" "${destination}"
sha256sum "${destination}" > "${destination}.sha256"
echo "${destination}"
