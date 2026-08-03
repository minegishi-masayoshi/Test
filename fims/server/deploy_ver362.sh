#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/fims-api"
SOURCE_DIR="${1:-/home/ubuntu}"
STAMP="$(date +%Y%m%d_%H%M%S)"

for file in import_auto_api.py constraint_api.py; do
  if [[ ! -f "${SOURCE_DIR}/${file}" ]]; then
    echo "ERROR: ${SOURCE_DIR}/${file} was not found."
    exit 1
  fi
done

cp "${APP_DIR}/main.py" \
   "${APP_DIR}/main.py.bak_ver362_${STAMP}"
cp "${APP_DIR}/constraint_api.py" \
   "${APP_DIR}/constraint_api.py.bak_ver362_${STAMP}" 2>/dev/null || true
cp "${APP_DIR}/import_auto_api.py" \
   "${APP_DIR}/import_auto_api.py.bak_ver362_${STAMP}" 2>/dev/null || true

cp "${SOURCE_DIR}/constraint_api.py" "${APP_DIR}/constraint_api.py"
cp "${SOURCE_DIR}/import_auto_api.py" "${APP_DIR}/import_auto_api.py"
chown ubuntu:ubuntu \
  "${APP_DIR}/constraint_api.py" \
  "${APP_DIR}/import_auto_api.py"

python3 - "${APP_DIR}/main.py" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

import_line = "from constraint_api import router as constraint_router"
include_line = "app.include_router(constraint_router)"

if import_line not in text:
    marker = "from import_auto_api import router as import_auto_router"
    text = (
        text.replace(marker, marker + "\n" + import_line)
        if marker in text
        else import_line + "\n" + text
    )

if include_line not in text:
    marker = "app.include_router(import_auto_router)"
    text = (
        text.replace(marker, marker + "\n" + include_line)
        if marker in text
        else text + "\n" + include_line + "\n"
    )

path.write_text(text, encoding="utf-8")
PY

cd "${APP_DIR}"
./venv/bin/python -m py_compile \
  main.py import_auto_api.py constraint_api.py

sudo systemctl restart fims-api
sleep 2
systemctl status fims-api --no-pager

echo
echo "Ver.3.6.2 endpoints:"
curl -s http://127.0.0.1:8001/openapi.json \
  | grep -o '"/api/constraints/[^"]*"' \
  | sort -u
