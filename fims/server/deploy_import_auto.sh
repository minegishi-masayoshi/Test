#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/fims-api"
SOURCE_FILE="${1:-/home/ubuntu/import_auto_api.py}"
TARGET_FILE="${APP_DIR}/import_auto_api.py"
BACKUP_FILE="${TARGET_FILE}.bak_before_ver350_$(date +%Y%m%d_%H%M%S)"

if [[ ! -f "${SOURCE_FILE}" ]]; then
  echo "ERROR: ${SOURCE_FILE} was not found."
  exit 1
fi

cp "${TARGET_FILE}" "${BACKUP_FILE}"
cp "${SOURCE_FILE}" "${TARGET_FILE}"
chown ubuntu:ubuntu "${TARGET_FILE}"

cd "${APP_DIR}"
./venv/bin/python -m py_compile import_auto_api.py main.py
sudo systemctl restart fims-api
systemctl status fims-api --no-pager

echo
echo "Constraint targets:"
curl -s http://127.0.0.1:8001/openapi.json   | grep -o '"/api/imports/gpkg-auto"'   | head -1
