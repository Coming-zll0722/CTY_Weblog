#!/usr/bin/env bash
set -Eeuo pipefail

read -r operation release_id api_digest web_digest revision extra \
  <<< "${SSH_ORIGINAL_COMMAND:-}"

if [[ "${operation:-}" != "deploy" \
  && "${operation:-}" != "load" ]] || [[ -n "${extra:-}" ]]; then
  echo "This SSH key may only trigger a CTY Log release." >&2
  exit 64
fi

[[ "${release_id:-}" =~ ^release-[A-Za-z0-9._-]+$ ]] || exit 64
[[ "${api_digest:-}" =~ ^sha256:[0-9a-f]{64}$ ]] || exit 64
[[ "${web_digest:-}" =~ ^sha256:[0-9a-f]{64}$ ]] || exit 64
[[ "${revision:-}" =~ ^[0-9a-f]{40}$ ]] || exit 64

if [[ "${operation}" == "load" ]]; then
  exec sudo -n /usr/local/sbin/cty-log-load-images \
    "${release_id}" "${api_digest}" "${web_digest}" "${revision}"
fi

exec sudo -n /usr/local/sbin/cty-log-deploy \
  "${release_id}" "${api_digest}" "${web_digest}" "${revision}"
