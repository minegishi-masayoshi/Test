#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/fims-api"
MODULE_SOURCE="${1:-./import_auto_api.py}"
MAIN_FILE="${APP_DIR}/main.py"
MODULE_TARGET="${APP_DIR}/import_auto_api.py"
BACKUP="${MAIN_FILE}.bak_before_ver330_$(date +%Y%m%d_%H%M%S)"

if [[ ! -f "${MODULE_SOURCE}" ]]; then
  echo "ERROR: ${MODULE_SOURCE} was not found."
  exit 1
fi

sudo cp "${MAIN_FILE}" "${BACKUP}"
sudo cp "${MODULE_SOURCE}" "${MODULE_TARGET}"
sudo chown ubuntu:ubuntu "${MODULE_TARGET}"

if ! grep -q "import_auto_router" "${MAIN_FILE}"; then
  cat >> "${MAIN_FILE}" <<'PYCODE'


# ============================================================
# FIMS Cloud Ver.3.3 automatic GPKG import
# ============================================================
from import_auto_api import router as import_auto_router

app.include_router(import_auto_router)
PYCODE
fi

cd "${APP_DIR}"
./venv/bin/python -m py_compile main.py import_auto_api.py
sudo systemctl restart fims-api
systemctl status fims-api --no-pager

echo
echo "Check endpoint:"
curl -s http://127.0.0.1:8001/openapi.json \
  | grep -o '"/api/imports/gpkg-auto"' \
  | head -1
