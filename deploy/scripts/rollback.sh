#!/usr/bin/env bash
set -Eeuo pipefail

# shellcheck source=common.sh
source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)/common.sh"

release_id="${1:-}"
if [[ ! "${release_id}" =~ ^[0-9]{8}T[0-9]{6}Z$ ]]; then
  echo "Usage: rollback.sh YYYYMMDDTHHMMSSZ" >&2
  exit 1
fi

api_image="engineering-notes-api:rollback-${release_id}"
web_image="engineering-notes-web:rollback-${release_id}"
docker image inspect "${api_image}" >/dev/null
docker image inspect "${web_image}" >/dev/null

bash "${SCRIPT_DIR}/backup.sh"
docker tag "${api_image}" engineering-notes-api:current
docker tag "${web_image}" engineering-notes-web:current
"${compose[@]}" up -d --no-build --no-deps --force-recreate api web

curl --fail --silent --show-error --retry 12 --retry-delay 5 \
  http://127.0.0.1:8000/api/v1/health >/dev/null
curl --fail --silent --show-error --retry 12 --retry-delay 5 \
  http://127.0.0.1:3000/ >/dev/null

echo "Application images rolled back to ${release_id}; database and volumes were not rolled back."
