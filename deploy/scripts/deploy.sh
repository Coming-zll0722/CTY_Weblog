#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# shellcheck source=common.sh
source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)/common.sh"

release_id="${1:-}"
api_image="${2:-}"
web_image="${3:-}"
registry_user="${4:-}"
state_root="${PROJECT_ROOT}/var/releases"
current_state="${state_root}/current.env"
release_state="${state_root}/${release_id}.env"

usage() {
  echo "Usage: deploy.sh RELEASE_ID API_IMAGE@sha256:DIGEST WEB_IMAGE@sha256:DIGEST REGISTRY_USER" >&2
  exit 64
}

[[ "${release_id}" =~ ^release-[A-Za-z0-9._-]+$ ]] || usage
[[ "${api_image}" =~ ^ghcr\.io/coming-zll0722/cty-weblog-api@sha256:[0-9a-f]{64}$ ]] || usage
[[ "${web_image}" =~ ^ghcr\.io/coming-zll0722/cty-weblog-web@sha256:[0-9a-f]{64}$ ]] || usage
[[ "${registry_user}" =~ ^[A-Za-z0-9-]+$ ]] || usage

IFS= read -r registry_token
if [[ ${#registry_token} -lt 20 ]]; then
  echo "A short-lived GHCR token must be provided on standard input." >&2
  exit 65
fi

cleanup() {
  registry_token=""
  docker logout ghcr.io >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf '%s' "${registry_token}" \
  | docker login ghcr.io --username "${registry_user}" --password-stdin >/dev/null
registry_token=""

install -d -m 0700 "${state_root}"

previous_release="legacy-local"
previous_api_image="engineering-notes-api:current"
previous_web_image="engineering-notes-web:current"
if [[ -f "${current_state}" ]]; then
  # shellcheck disable=SC1090
  source "${current_state}"
  previous_release="${RELEASE_ID}"
  previous_api_image="${API_IMAGE}"
  previous_web_image="${WEB_IMAGE}"
fi

valid_runtime_image() {
  local image_ref="$1"
  [[ "${image_ref}" =~ ^ghcr\.io/coming-zll0722/cty-weblog-(api|web)@sha256:[0-9a-f]{64}$ ]] \
    || [[ "${image_ref}" =~ ^engineering-notes-(api|web):current$ ]]
}

valid_runtime_image "${previous_api_image}" || {
  echo "The current API image state is invalid." >&2
  exit 66
}
valid_runtime_image "${previous_web_image}" || {
  echo "The current web image state is invalid." >&2
  exit 66
}

echo "Pulling immutable release images."
docker pull "${api_image}" >/dev/null
docker pull "${web_image}" >/dev/null

export API_IMAGE="${api_image}"
export WEB_IMAGE="${web_image}"
"${compose[@]}" config --quiet

volume_name="engineering-notes_postgres_data"
if "${compose[@]}" ps --status running --services | grep -qx "postgres"; then
  bash "${SCRIPT_DIR}/backup.sh"
elif docker volume inspect "${volume_name}" >/dev/null 2>&1; then
  echo "A PostgreSQL volume exists but the database is not healthy. Refusing deployment." >&2
  exit 1
else
  echo "No existing PostgreSQL volume: treating this as a verified first deployment."
  "${compose[@]}" up -d --no-deps postgres
  for _attempt in $(seq 1 30); do
    if "${compose[@]}" exec -T postgres \
      pg_isready --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
  "${compose[@]}" exec -T postgres \
    pg_isready --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" >/dev/null
fi

echo "Applying forward-only database migrations."
"${compose[@]}" run --rm --no-deps migrate

rollback_apps() {
  echo "Restoring application images from ${previous_release}; database migrations are not downgraded." >&2
  export API_IMAGE="${previous_api_image}"
  export WEB_IMAGE="${previous_web_image}"
  "${compose[@]}" up -d --no-build --no-deps --pull never --force-recreate api web
}

echo "Switching API image."
"${compose[@]}" up -d --no-build --no-deps --pull never --force-recreate api
if ! curl --fail --silent --show-error --retry 12 --retry-delay 5 \
  --retry-connrefused --retry-all-errors \
  http://127.0.0.1:8000/api/v1/health >/dev/null; then
  rollback_apps
  exit 1
fi

echo "Switching web image."
"${compose[@]}" up -d --no-build --no-deps --pull never --force-recreate web
if ! curl --fail --silent --show-error --retry 12 --retry-delay 5 \
  --retry-connrefused --retry-all-errors \
  http://127.0.0.1:3000/ >/dev/null; then
  rollback_apps
  exit 1
fi

if ! curl --fail --silent --show-error --retry 6 --retry-delay 3 \
  --retry-all-errors --resolve devlelin.xyz:443:127.0.0.1 \
  https://devlelin.xyz/api/v1/health >/dev/null; then
  rollback_apps
  exit 1
fi

state_tmp="$(mktemp "${state_root}/.release-state.XXXXXX")"
{
  printf 'RELEASE_ID=%s\n' "${release_id}"
  printf 'API_IMAGE=%s\n' "${api_image}"
  printf 'WEB_IMAGE=%s\n' "${web_image}"
  printf 'DEPLOYED_AT=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "${state_tmp}"
chmod 0600 "${state_tmp}"
install -m 0600 "${state_tmp}" "${release_state}"
mv -f -- "${state_tmp}" "${current_state}"

"${compose[@]}" ps
echo "Release ${release_id} passed backup, migration, application, and HTTPS health checks."
