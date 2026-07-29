#!/usr/bin/env bash
set -Eeuo pipefail

# shellcheck source=common.sh
source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)/common.sh"

release_id="$(date -u +%Y%m%dT%H%M%SZ)"
volume_name="engineering-notes_postgres_data"
rollback_available=false

if "${compose[@]}" ps --status running --services | grep -qx "postgres"; then
  bash "${SCRIPT_DIR}/backup.sh"
elif docker volume inspect "${volume_name}" >/dev/null 2>&1; then
  echo "A PostgreSQL volume exists but the database is not healthy. Refusing deployment." >&2
  exit 1
else
  echo "No existing PostgreSQL volume: treating this as a verified first deployment."
fi

if docker image inspect engineering-notes-api:current >/dev/null 2>&1 \
  && docker image inspect engineering-notes-web:current >/dev/null 2>&1; then
  docker tag engineering-notes-api:current "engineering-notes-api:rollback-${release_id}"
  docker tag engineering-notes-web:current "engineering-notes-web:rollback-${release_id}"
  rollback_available=true
fi

"${compose[@]}" config --quiet
"${compose[@]}" build api web

if ! "${compose[@]}" up -d; then
  if [[ "${rollback_available}" == true ]]; then
    docker tag "engineering-notes-api:rollback-${release_id}" engineering-notes-api:current
    docker tag "engineering-notes-web:rollback-${release_id}" engineering-notes-web:current
    "${compose[@]}" up -d --no-build --no-deps --force-recreate api web
  fi
  echo "Deployment failed. Database migrations were not downgraded." >&2
  exit 1
fi

if ! curl --fail --silent --show-error --retry 12 --retry-delay 5 \
  --retry-connrefused --retry-all-errors \
  http://127.0.0.1:8000/api/v1/health >/dev/null \
  || ! curl --fail --silent --show-error --retry 12 --retry-delay 5 \
  --retry-connrefused --retry-all-errors \
  http://127.0.0.1:3000/ >/dev/null; then
  if [[ "${rollback_available}" == true ]]; then
    docker tag "engineering-notes-api:rollback-${release_id}" engineering-notes-api:current
    docker tag "engineering-notes-web:rollback-${release_id}" engineering-notes-web:current
    "${compose[@]}" up -d --no-build --no-deps --force-recreate api web
  fi
  echo "Health verification failed. Code images were rolled back when available; the database was left intact." >&2
  exit 1
fi

"${compose[@]}" ps
echo "Deployment ${release_id} passed local health checks."
