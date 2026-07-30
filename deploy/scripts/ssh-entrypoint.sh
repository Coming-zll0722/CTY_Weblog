#!/usr/bin/env bash
set -Eeuo pipefail

read -r operation release_id api_image web_image registry_user extra \
  <<< "${SSH_ORIGINAL_COMMAND:-}"

if [[ "${operation:-}" != "deploy" || -n "${extra:-}" ]]; then
  echo "This SSH key may only trigger a CTY Log release." >&2
  exit 64
fi

[[ "${release_id:-}" =~ ^release-[A-Za-z0-9._-]+$ ]] || exit 64
[[ "${api_image:-}" =~ ^ghcr\.io/coming-zll0722/cty-weblog-api@sha256:[0-9a-f]{64}$ ]] || exit 64
[[ "${web_image:-}" =~ ^ghcr\.io/coming-zll0722/cty-weblog-web@sha256:[0-9a-f]{64}$ ]] || exit 64
[[ "${registry_user:-}" =~ ^[A-Za-z0-9-]+$ ]] || exit 64

exec sudo -n /usr/local/sbin/cty-log-deploy \
  "${release_id}" "${api_image}" "${web_image}" "${registry_user}"
