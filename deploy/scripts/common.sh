#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
DEPLOY_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd -P)"
PROJECT_ROOT="$(cd -- "${DEPLOY_DIR}/.." && pwd -P)"

if [[ ! -f "${DEPLOY_DIR}/compose.prod.yml" ]]; then
  echo "Refusing to run outside the CTY Log deployment directory." >&2
  exit 1
fi
if [[ ! -f "${DEPLOY_DIR}/.env" ]]; then
  echo "Missing ${DEPLOY_DIR}/.env. Copy .env.production.example and fill it securely." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "${DEPLOY_DIR}/.env"
set +a

required_variables=(
  POSTGRES_DB
  POSTGRES_USER
  POSTGRES_PASSWORD
  APP_SECRET_KEY
  PUBLIC_ORIGIN
  API_CORS_ORIGINS
  API_ALLOWED_HOSTS
)
for variable_name in "${required_variables[@]}"; do
  if [[ -z "${!variable_name:-}" ]]; then
    echo "Required deployment variable is missing: ${variable_name}" >&2
    exit 1
  fi
done

cd "${DEPLOY_DIR}"
compose=(
  docker compose
  --project-name engineering-notes
  --env-file "${DEPLOY_DIR}/.env"
  --file "${DEPLOY_DIR}/compose.prod.yml"
)
