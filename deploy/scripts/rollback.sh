#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# shellcheck source=common.sh
source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)/common.sh"

release_id="${1:-}"
state_root="${PROJECT_ROOT}/var/releases"
release_state="${state_root}/${release_id}.env"
current_state="${state_root}/current.env"

if [[ ! "${release_id}" =~ ^release-[A-Za-z0-9._-]+$ || ! -f "${release_state}" ]]; then
  echo "Usage: rollback.sh RELEASE_ID (the release must exist under ${state_root})" >&2
  exit 64
fi

# shellcheck disable=SC1090
source "${release_state}"
if [[ "${RELEASE_ID}" != "${release_id}" \
  || ! "${API_IMAGE}" =~ ^ghcr\.io/coming-zll0722/cty-weblog-api@sha256:[0-9a-f]{64}$ \
  || ! "${WEB_IMAGE}" =~ ^ghcr\.io/coming-zll0722/cty-weblog-web@sha256:[0-9a-f]{64}$ ]]; then
  echo "Stored release state is invalid." >&2
  exit 65
fi

docker image inspect "${API_IMAGE}" >/dev/null
docker image inspect "${WEB_IMAGE}" >/dev/null

bash "${SCRIPT_DIR}/backup.sh"
export API_IMAGE WEB_IMAGE
"${compose[@]}" up -d --no-build --no-deps --pull never --force-recreate api web

curl --fail --silent --show-error --retry 12 --retry-delay 5 \
  --retry-connrefused --retry-all-errors \
  http://127.0.0.1:8000/api/v1/health >/dev/null
curl --fail --silent --show-error --retry 12 --retry-delay 5 \
  --retry-connrefused --retry-all-errors \
  http://127.0.0.1:3000/ >/dev/null
curl --fail --silent --show-error --retry 6 --retry-delay 3 \
  --retry-all-errors --resolve devlelin.xyz:443:127.0.0.1 \
  https://devlelin.xyz/api/v1/health >/dev/null

state_tmp="$(mktemp "${state_root}/.rollback-state.XXXXXX")"
cp -- "${release_state}" "${state_tmp}"
chmod 0600 "${state_tmp}"
mv -f -- "${state_tmp}" "${current_state}"

echo "Application images rolled back to ${release_id}; database and volumes were not rolled back."
