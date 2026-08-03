#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-/home/ubuntu}"
APP_DIR="/home/ubuntu/fims-api"
STAMP="$(date +%Y%m%d_%H%M%S)"

for file in constraint_api.py import_auto_api.py fims-api-timeouts.conf; do
  if [[ ! -f "${SOURCE_DIR}/${file}" ]]; then
    echo "ERROR: ${SOURCE_DIR}/${file} was not found."
    exit 1
  fi
done

cp "${APP_DIR}/constraint_api.py" \
   "${APP_DIR}/constraint_api.py.bak_ver363_${STAMP}" 2>/dev/null || true
cp "${APP_DIR}/import_auto_api.py" \
   "${APP_DIR}/import_auto_api.py.bak_ver363_${STAMP}" 2>/dev/null || true

cp "${SOURCE_DIR}/constraint_api.py" "${APP_DIR}/constraint_api.py"
cp "${SOURCE_DIR}/import_auto_api.py" "${APP_DIR}/import_auto_api.py"
chown ubuntu:ubuntu \
  "${APP_DIR}/constraint_api.py" \
  "${APP_DIR}/import_auto_api.py"

cd "${APP_DIR}"
./venv/bin/python -m py_compile main.py constraint_api.py import_auto_api.py

sudo systemctl restart fims-api
sleep 2

if [[ -f /etc/nginx/conf.d/fims-api-timeouts.conf ]]; then
  sudo cp /etc/nginx/conf.d/fims-api-timeouts.conf \
    "/etc/nginx/conf.d/fims-api-timeouts.conf.bak_${STAMP}"
fi

sudo cp "${SOURCE_DIR}/fims-api-timeouts.conf" \
  /etc/nginx/conf.d/fims-api-timeouts.conf
sudo chmod 644 /etc/nginx/conf.d/fims-api-timeouts.conf

sudo nginx -t
sudo systemctl reload nginx

echo
echo "fims-api:"
systemctl status fims-api --no-pager

echo
echo "nginx:"
systemctl status nginx --no-pager

echo
echo "Ver.3.6.3 endpoints:"
curl -s http://127.0.0.1:8001/openapi.json \
  | grep -o '"/api/constraints/[^"]*"' \
  | sort -u
