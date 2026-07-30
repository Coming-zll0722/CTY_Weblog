#!/usr/bin/env bash
set -Eeuo pipefail

release_id="${1:-}"
api_digest="${2:-}"
web_digest="${3:-}"
revision="${4:-}"

usage() {
  echo "Usage: load-images.sh RELEASE_ID API_DIGEST WEB_DIGEST GIT_REVISION" >&2
  exit 64
}

[[ "${release_id}" =~ ^release-[A-Za-z0-9._-]+$ ]] || usage
[[ "${api_digest}" =~ ^sha256:[0-9a-f]{64}$ ]] || usage
[[ "${web_digest}" =~ ^sha256:[0-9a-f]{64}$ ]] || usage
[[ "${revision}" =~ ^[0-9a-f]{40}$ ]] || usage

api_image="cty-log-api:${release_id}"
web_image="cty-log-web:${release_id}"

gzip --decompress --stdout | docker image load

for image_ref in "${api_image}" "${web_image}"; do
  docker image inspect "${image_ref}" >/dev/null
  image_source="$(
    docker image inspect "${image_ref}" \
      --format '{{ index .Config.Labels "org.opencontainers.image.source" }}'
  )"
  image_revision="$(
    docker image inspect "${image_ref}" \
      --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}'
  )"
  if [[ "${image_source}" != "https://github.com/Coming-zll0722/CTY_Weblog" \
    || "${image_revision}" != "${revision}" ]]; then
    echo "Transferred image provenance labels do not match the requested release." >&2
    exit 67
  fi
done

echo "Loaded ${api_image} from ${api_digest}."
echo "Loaded ${web_image} from ${web_digest}."
