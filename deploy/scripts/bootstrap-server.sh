#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

if [[ "$(id -u)" -ne 0 ]]; then
  echo "bootstrap-server.sh must run as root." >&2
  exit 77
fi

stage_root="${1:-}"
if [[ -z "${stage_root}" \
  || ! -f "${stage_root}/deploy/compose.prod.yml" \
  || ! -f "${stage_root}/deploy-key.pub" ]]; then
  echo "Usage: bootstrap-server.sh STAGE_ROOT" >&2
  exit 64
fi

project_root="/opt/cty-log"
deploy_root="${project_root}/deploy"

install -d -m 0755 -o root -g root \
  "${project_root}" "${deploy_root}" "${deploy_root}/scripts"
install -d -m 0700 -o root -g root \
  "${project_root}/var" "${project_root}/var/backups" "${project_root}/var/releases"

for file in \
  compose.prod.yml docker-compose.yml api.Dockerfile web.Dockerfile \
  nginx.conf nginx-host.conf logrotate-engineering-notes \
  .env.production.example sudoers-cty-log-deploy; do
  install -m 0644 -o root -g root \
    "${stage_root}/deploy/${file}" "${deploy_root}/${file}"
done

for file in \
  common.sh backup.sh deploy.sh deploy-entrypoint.sh rollback.sh \
  load-images.sh load-images-entrypoint.sh restore-isolated.sh \
  ssh-entrypoint.sh bootstrap-server.sh; do
  install -m 0755 -o root -g root \
    "${stage_root}/deploy/scripts/${file}" "${deploy_root}/scripts/${file}"
done

if [[ ! -f "${deploy_root}/.env" ]]; then
  install -m 0600 -o root -g root \
    /opt/engineering-notes/deploy/.env "${deploy_root}/.env"
fi

current_state="${project_root}/var/releases/current.env"
if [[ ! -f "${current_state}" ]]; then
  {
    printf 'RELEASE_ID=legacy-local\n'
    printf 'API_IMAGE=engineering-notes-api:current\n'
    printf 'WEB_IMAGE=engineering-notes-web:current\n'
    printf 'DEPLOYED_AT=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "${current_state}"
  chmod 0600 "${current_state}"
fi

install -m 0755 -o root -g root \
  "${deploy_root}/scripts/deploy-entrypoint.sh" /usr/local/sbin/cty-log-deploy
install -m 0755 -o root -g root \
  "${deploy_root}/scripts/load-images-entrypoint.sh" /usr/local/sbin/cty-log-load-images
install -m 0755 -o root -g root \
  "${deploy_root}/scripts/ssh-entrypoint.sh" /usr/local/sbin/cty-log-ssh-entrypoint

visudo -cf "${stage_root}/deploy/sudoers-cty-log-deploy"
install -m 0440 -o root -g root \
  "${stage_root}/deploy/sudoers-cty-log-deploy" /etc/sudoers.d/cty-log-deploy
visudo -cf /etc/sudoers.d/cty-log-deploy

if ! id cty-deploy >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /var/lib/cty-deploy \
    --shell /bin/bash cty-deploy
fi
install -d -m 0700 -o cty-deploy -g cty-deploy /var/lib/cty-deploy/.ssh

key_options='restrict,command="/usr/local/sbin/cty-log-ssh-entrypoint"'
authorized_keys="$(mktemp)"
printf '%s %s\n' "${key_options}" "$(cat "${stage_root}/deploy-key.pub")" \
  > "${authorized_keys}"
install -m 0600 -o cty-deploy -g cty-deploy \
  "${authorized_keys}" /var/lib/cty-deploy/.ssh/authorized_keys
rm -f -- "${authorized_keys}"

docker compose \
  --project-name engineering-notes \
  --env-file "${deploy_root}/.env" \
  --file "${deploy_root}/compose.prod.yml" \
  config --quiet

echo "CTY Log restricted deployment entrypoint is ready."
