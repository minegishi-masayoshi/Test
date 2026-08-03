#!/usr/bin/env bash
set -euo pipefail
SOURCE_DIR="${1:-/home/ubuntu}"
APP_DIR="/home/ubuntu/fims-api"
STAMP="$(date +%Y%m%d_%H%M%S)"
for file in constraint_api.py import_auto_api.py; do
  [[ -f "${SOURCE_DIR}/${file}" ]] || { echo "ERROR: ${SOURCE_DIR}/${file} not found"; exit 1; }
done
cp "${APP_DIR}/constraint_api.py" "${APP_DIR}/constraint_api.py.bak_ver370_${STAMP}" 2>/dev/null || true
cp "${APP_DIR}/import_auto_api.py" "${APP_DIR}/import_auto_api.py.bak_ver370_${STAMP}" 2>/dev/null || true
cp "${SOURCE_DIR}/constraint_api.py" "${APP_DIR}/constraint_api.py"
cp "${SOURCE_DIR}/import_auto_api.py" "${APP_DIR}/import_auto_api.py"
chown ubuntu:ubuntu "${APP_DIR}/constraint_api.py" "${APP_DIR}/import_auto_api.py"
cd "${APP_DIR}"
./venv/bin/python -m py_compile main.py constraint_api.py import_auto_api.py
sudo systemctl restart fims-api
sleep 2
systemctl status fims-api --no-pager
echo
echo "Ver.3.7 endpoints:"
curl -s http://127.0.0.1:8001/openapi.json | grep -o '"/api/constraints/[^"]*"' | sort -u
