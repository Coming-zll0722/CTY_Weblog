#!/usr/bin/env bash
set -Eeuo pipefail

exec /opt/cty-log/deploy/scripts/load-images.sh "$@"
