#!/usr/bin/env bash
set -euo pipefail

SOURCE="${1:-/home/ubuntu/fims-api-timeouts.conf}"
TARGET="/etc/nginx/conf.d/fims-api-timeouts.conf"
STAMP="$(date +%Y%m%d_%H%M%S)"

if [[ ! -f "${SOURCE}" ]]; then
  echo "ERROR: ${SOURCE} was not found."
  exit 1
fi

if [[ -f "${TARGET}" ]]; then
  sudo cp "${TARGET}" "${TARGET}.bak_${STAMP}"
fi

sudo cp "${SOURCE}" "${TARGET}"
sudo chmod 644 "${TARGET}"

echo "Testing nginx configuration..."
sudo nginx -t

echo "Reloading nginx..."
sudo systemctl reload nginx

echo
echo "Installed timeout configuration:"
sudo cat "${TARGET}"

echo
echo "nginx status:"
systemctl status nginx --no-pager
