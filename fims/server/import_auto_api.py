"""
FIMS Cloud Ver.3.5.0
Automatic GeoPackage -> PostGIS -> GeoServer import API.

Mount this router in the existing FastAPI application:

    from import_auto_api import router as import_auto_router
    app.include_router(import_auto_router)

Required existing environment variables:
    DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

Optional environment variables:
    GEOSERVER_URL       default: http://127.0.0.1:8080/geoserver
    GEOSERVER_USER      default: admin
    GEOSERVER_PASSWORD  default: geoserver
    GEOSERVER_WORKSPACE default: fims
    GEOSERVER_STORE     default: fims_postgis
"""

from __future__ import annotations

import base64
import json
import os
import re
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError


router = APIRouter(tags=["GIS Import"])

ALLOWED_TARGETS: dict[str, dict[str, str]] = {
    "concessionarea": {
        "title": "Concession Area",
        "map_layer": "concession",
    },
    "logged_notlanduse_current": {
        "title": "Logged Not Land Use Current",
        "map_layer": "loggedNotLandUseCurrent",
    },
    "logged_landuse_current": {
        "title": "Logged Land Use Current",
        "map_layer": "loggedLandUseCurrent",
    },
    "landuse_notlogged_current": {
        "title": "Land Use Not Logged Current",
        "map_layer": "landUseNotLoggedCurrent",
    },
    "protected_area": {
        "title": "Protected Area",
        "map_layer": "protectedArea",
    },
    "planarea": {
        "title": "Plan Area",
        "map_layer": "planArea",
    },
    "extreme_slope": {
        "title": "Extreme Slope",
        "map_layer": "extremeSlope",
    },
    "extreme_altitude": {
        "title": "Extreme Altitude",
        "map_layer": "extremeAltitude",
    },
    "extreme_karst": {
        "title": "Extreme Karst",
        "map_layer": "extremeKarst",
    },
    "extreme_inundation": {
        "title": "Extreme Inundation",
        "map_layer": "extremeInundation",
    },
    "extreme_mangrove": {
        "title": "Extreme Mangrove",
        "map_layer": "extremeMangrove",
    },
    "serious_sloperelief": {
        "title": "Serious Slope Relief",
        "map_layer": "seriousSlopeRelief",
    },
    "serious_inundation": {
        "title": "Serious Inundation",
        "map_layer": "seriousInundation",
    },
}

TARGET_SRID = 20355
TARGET_GEOMETRY_TYPE = "MULTIPOLYGON"
MAX_UPLOAD_BYTES = 250 * 1024 * 1024

DB_USER = os.environ["DB_USER"]
DB_PASSWORD = os.environ["DB_PASSWORD"]
DB_HOST = os.environ["DB_HOST"]
DB_PORT = os.environ.get("DB_PORT", "5432")
DB_NAME = os.environ["DB_NAME"]

DATABASE_URL = (
    "postgresql+psycopg2://"
    f"{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

engine: Engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

GEOSERVER_URL = os.environ.get(
    "GEOSERVER_URL",
    "http://127.0.0.1:8080/geoserver",
).rstrip("/")
GEOSERVER_USER = os.environ.get("GEOSERVER_USER", "admin")
GEOSERVER_PASSWORD = os.environ.get("GEOSERVER_PASSWORD", "geoserver")
GEOSERVER_WORKSPACE = os.environ.get("GEOSERVER_WORKSPACE", "fims")
GEOSERVER_STORE = os.environ.get("GEOSERVER_STORE", "fims_postgis")


def _safe_identifier(value: str, field_name: str) -> str:
    normalized = value.strip().lower()
    if not re.fullmatch(r"[a-z][a-z0-9_]{0,62}", normalized):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid {field_name}.",
        )
    return normalized


def _pg_ogr_connection() -> str:
    return (
        f"PG:host={DB_HOST} "
        f"port={DB_PORT} "
        f"dbname={DB_NAME} "
        f"user={DB_USER} "
        f"password={DB_PASSWORD}"
    )


def _run(command: list[str], timeout: int = 1800) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=500,
            detail=f"Required command not found: {command[0]}",
        ) from error
    except subprocess.TimeoutExpired as error:
        raise HTTPException(
            status_code=504,
            detail=f"Command timed out: {command[0]}",
        ) from error
    except subprocess.CalledProcessError as error:
        detail = (error.stderr or error.stdout or str(error)).strip()
        raise HTTPException(
            status_code=500,
            detail=f"{command[0]} failed: {detail}",
        ) from error


def _source_count(gpkg_path: Path, source_layer: str) -> int | None:
    result = _run(
        [
            "ogrinfo",
            "-ro",
            "-so",
            str(gpkg_path),
            source_layer,
        ],
        timeout=120,
    )
    match = re.search(r"Feature Count:\s*(\d+)", result.stdout)
    return int(match.group(1)) if match else None


def _geoserver_request(
    method: str,
    path: str,
    body: bytes | None = None,
    content_type: str = "application/xml",
) -> tuple[int, str]:
    token = base64.b64encode(
        f"{GEOSERVER_USER}:{GEOSERVER_PASSWORD}".encode("utf-8")
    ).decode("ascii")

    request = Request(
        f"{GEOSERVER_URL}{path}",
        data=body,
        method=method,
        headers={
            "Authorization": f"Basic {token}",
            "Content-Type": content_type,
            "Accept": "application/xml, application/json",
        },
    )

    try:
        with urlopen(request, timeout=60) as response:
            return response.status, response.read().decode("utf-8", "replace")
    except HTTPError as error:
        return error.code, error.read().decode("utf-8", "replace")
    except URLError as error:
        raise HTTPException(
            status_code=502,
            detail=f"GeoServer connection failed: {error.reason}",
        ) from error


def _publish_feature_type(target: str, title: str) -> dict[str, Any]:
    base_path = (
        f"/rest/workspaces/{GEOSERVER_WORKSPACE}"
        f"/datastores/{GEOSERVER_STORE}/featuretypes"
    )
    feature_path = f"{base_path}/{target}.xml"

    status, _ = _geoserver_request("GET", feature_path)

    if status == 200:
        publish_action = "already_published"
    elif status == 404:
        payload = (
            "<featureType>"
            f"<name>{target}</name>"
            f"<nativeName>{target}</nativeName>"
            f"<title>{title}</title>"
            f"<srs>EPSG:{TARGET_SRID}</srs>"
            "<projectionPolicy>FORCE_DECLARED</projectionPolicy>"
            "<enabled>true</enabled>"
            "</featureType>"
        ).encode("utf-8")

        create_status, create_body = _geoserver_request(
            "POST",
            base_path,
            body=payload,
        )

        if create_status not in {200, 201}:
            raise HTTPException(
                status_code=502,
                detail=(
                    "GeoServer publish failed "
                    f"(HTTP {create_status}): {create_body}"
                ),
            )
        publish_action = "published"
    else:
        raise HTTPException(
            status_code=502,
            detail=f"GeoServer feature type check failed (HTTP {status}).",
        )

    reload_status, reload_body = _geoserver_request(
        "POST",
        "/rest/reload",
        body=b"",
        content_type="text/plain",
    )
    if reload_status not in {200, 201}:
        raise HTTPException(
            status_code=502,
            detail=(
                "GeoServer reload failed "
                f"(HTTP {reload_status}): {reload_body}"
            ),
        )

    return {
        "workspace": GEOSERVER_WORKSPACE,
        "store": GEOSERVER_STORE,
        "feature_type": target,
        "publish_action": publish_action,
        "catalog_reloaded": True,
        "wms_layer": f"{GEOSERVER_WORKSPACE}:{target}",
    }


def _column_metadata(
    connection: Any,
    table_name: str,
) -> list[dict[str, str]]:
    rows = connection.execute(
        text(
            """
            SELECT
                column_name,
                data_type,
                udt_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = :table_name
            ORDER BY ordinal_position
            """
        ),
        {"table_name": table_name},
    ).mappings().all()

    return [
        {
            "column_name": str(row["column_name"]),
            "data_type": str(row["data_type"]),
            "udt_name": str(row["udt_name"]),
        }
        for row in rows
    ]


def _cast_expression(
    column_name: str,
    data_type: str,
    udt_name: str,
) -> str:
    quoted = f'"{column_name}"'
    as_text = f"NULLIF(BTRIM({quoted}::text), '')"

    if udt_name == "geometry":
        return quoted

    if data_type == "date":
        return f"{as_text}::date"

    if data_type in {
        "double precision",
        "real",
        "numeric",
        "decimal",
    }:
        return f"{as_text}::{data_type}"

    if data_type in {
        "smallint",
        "integer",
        "bigint",
    }:
        return f"{as_text}::{data_type}"

    if data_type == "boolean":
        return (
            "CASE "
            f"WHEN LOWER({as_text}) IN ('true','t','1','yes','y') THEN TRUE "
            f"WHEN LOWER({as_text}) IN ('false','f','0','no','n') THEN FALSE "
            "ELSE NULL END"
        )

    if data_type in {
        "timestamp without time zone",
        "timestamp with time zone",
        "time without time zone",
        "time with time zone",
    }:
        return f"{as_text}::{data_type}"

    if data_type in {
        "character varying",
        "character",
        "text",
    }:
        return f"{quoted}::text"

    return f"{quoted}::{udt_name}"


def _table_exists(connection: Any, table_name: str) -> bool:
    return bool(
        connection.execute(
            text(
                """
                SELECT to_regclass(:qualified_name) IS NOT NULL
                """
            ),
            {"qualified_name": f"public.{table_name}"},
        ).scalar_one()
    )


def _normalize_stage_geometry(connection: Any, stage_table: str) -> None:
    connection.execute(
        text(
            f"""
            ALTER TABLE public."{stage_table}"
            ALTER COLUMN geom
            TYPE geometry(MultiPolygon, {TARGET_SRID})
            USING ST_Multi(
                ST_CollectionExtract(
                    ST_MakeValid(
                        CASE
                            WHEN ST_SRID(geom) = {TARGET_SRID}
                                THEN geom
                            ELSE ST_Transform(geom, {TARGET_SRID})
                        END
                    ),
                    3
                )
            )
            """
        )
    )

    connection.execute(
        text(
            f"""
            DELETE FROM public."{stage_table}"
            WHERE geom IS NULL OR ST_IsEmpty(geom)
            """
        )
    )


def _copy_stage_to_target(
    connection: Any,
    stage_table: str,
    target: str,
    mode: str,
) -> tuple[bool, int, int]:
    target_created = not _table_exists(connection, target)

    if target_created:
        connection.execute(
            text(
                f'ALTER TABLE public."{stage_table}" RENAME TO "{target}"'
            )
        )
        imported_count = connection.execute(
            text(f'SELECT COUNT(*) FROM public."{target}"')
        ).scalar_one()
        return True, 0, int(imported_count)

    previous_count = int(
        connection.execute(
            text(f'SELECT COUNT(*) FROM public."{target}"')
        ).scalar_one()
    )

    # Normalize an existing target once as well.
    connection.execute(
        text(
            f"""
            ALTER TABLE public."{target}"
            ALTER COLUMN geom
            TYPE geometry(MultiPolygon, {TARGET_SRID})
            USING ST_Multi(
                ST_CollectionExtract(
                    ST_MakeValid(
                        CASE
                            WHEN ST_SRID(geom) = {TARGET_SRID}
                                THEN geom
                            ELSE ST_Transform(geom, {TARGET_SRID})
                        END
                    ),
                    3
                )
            )
            """
        )
    )

    source_metadata = _column_metadata(connection, stage_table)
    target_metadata = _column_metadata(connection, target)

    source_columns = {
        column["column_name"]
        for column in source_metadata
    }

    ignored_columns = {
        "id",
        "created_at",
        "updated_at",
    }

    common_metadata = [
        column
        for column in target_metadata
        if (
            column["column_name"] in source_columns
            and column["column_name"] not in ignored_columns
        )
    ]

    common_columns = [
        column["column_name"]
        for column in common_metadata
    ]

    if "geom" not in common_columns:
        raise HTTPException(
            status_code=500,
            detail="No common geometry column was found.",
        )

    target_column_sql = ", ".join(
        f'"{column}"'
        for column in common_columns
    )

    select_expressions = []
    for column in common_metadata:
        column_name = column["column_name"]
        expression = _cast_expression(
            column_name,
            column["data_type"],
            column["udt_name"],
        )
        select_expressions.append(
            f'{expression} AS "{column_name}"'
        )

    select_expression_sql = ", ".join(
        select_expressions
    )

    if mode == "replace":
        connection.execute(
            text(f'TRUNCATE TABLE public."{target}"')
        )

    connection.execute(
        text(
            f"""
            INSERT INTO public."{target}" ({target_column_sql})
            SELECT {select_expression_sql}
            FROM public."{stage_table}"
            """
        )
    )

    connection.execute(
        text(f'DROP TABLE public."{stage_table}"')
    )

    final_count = int(
        connection.execute(
            text(f'SELECT COUNT(*) FROM public."{target}"')
        ).scalar_one()
    )
    imported_count = (
        final_count
        if mode == "replace"
        else final_count - previous_count
    )

    return False, previous_count, imported_count


@router.post("/api/imports/gpkg-auto")
async def import_geopackage_auto(
    target: str = Form(...),
    mode: str = Form(...),
    source_layer: str = Form(...),
    file: UploadFile = File(...),
) -> dict[str, Any]:
    target = _safe_identifier(target, "target")
    source_layer = _safe_identifier(source_layer, "source_layer")
    mode = mode.strip().lower()

    if target not in ALLOWED_TARGETS:
        raise HTTPException(
            status_code=422,
            detail="Unsupported FIMS target layer.",
        )

    if mode not in {"add", "replace"}:
        raise HTTPException(
            status_code=422,
            detail="mode must be 'add' or 'replace'.",
        )

    file_name = Path(file.filename or "").name
    if not file_name.lower().endswith(".gpkg"):
        raise HTTPException(
            status_code=422,
            detail="Only GeoPackage (.gpkg) files are accepted.",
        )

    stage_table = f"_fims_import_{uuid.uuid4().hex[:16]}"

    with tempfile.TemporaryDirectory(prefix="fims_gpkg_") as temp_dir:
        gpkg_path = Path(temp_dir) / file_name
        total_size = 0

        with gpkg_path.open("wb") as output:
            while chunk := await file.read(1024 * 1024):
                total_size += len(chunk)
                if total_size > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail="GeoPackage exceeds the 250 MB limit.",
                    )
                output.write(chunk)

        source_count = _source_count(gpkg_path, source_layer)

        _run(
            [
                "ogr2ogr",
                "-f",
                "PostgreSQL",
                _pg_ogr_connection(),
                str(gpkg_path),
                source_layer,
                "-nln",
                f"public.{stage_table}",
                "-overwrite",
                "-nlt",
                "PROMOTE_TO_MULTI",
                "-makevalid",
                "-t_srs",
                f"EPSG:{TARGET_SRID}",
                "-lco",
                "GEOMETRY_NAME=geom",
                "-lco",
                "FID=gid",
            ]
        )

        try:
            with engine.begin() as connection:
                _normalize_stage_geometry(connection, stage_table)

                stage_count = int(
                    connection.execute(
                        text(
                            f'SELECT COUNT(*) FROM public."{stage_table}"'
                        )
                    ).scalar_one()
                )

                (
                    target_created,
                    previous_count,
                    imported_count,
                ) = _copy_stage_to_target(
                    connection,
                    stage_table,
                    target,
                    mode,
                )

                final_count = int(
                    connection.execute(
                        text(f'SELECT COUNT(*) FROM public."{target}"')
                    ).scalar_one()
                )

        except HTTPException:
            raise
        except SQLAlchemyError as error:
            # Best-effort cleanup of the staging table.
            try:
                with engine.begin() as cleanup:
                    cleanup.execute(
                        text(
                            f'DROP TABLE IF EXISTS public."{stage_table}"'
                        )
                    )
            except SQLAlchemyError:
                pass

            raise HTTPException(
                status_code=500,
                detail=f"PostGIS import failed: {error}",
            ) from error

    geoserver = _publish_feature_type(
        target,
        ALLOWED_TARGETS[target]["title"],
    )

    skipped_count = (
        max((source_count or stage_count) - imported_count, 0)
        if mode == "replace"
        else max((source_count or imported_count) - imported_count, 0)
    )

    return {
        "status": "ok",
        "target": target,
        "mode": mode,
        "source_layer": source_layer,
        "file_name": file_name,
        "file_size": total_size,
        "target_created": target_created,
        "previous_count": previous_count,
        "source_count": source_count,
        "imported_count": imported_count,
        "final_count": final_count,
        "skipped_count": skipped_count,
        "geometry_type": TARGET_GEOMETRY_TYPE,
        "srid": TARGET_SRID,
        "geoserver": geoserver,
        "map_layer_key": ALLOWED_TARGETS[target]["map_layer"],
        "next_action": "Review the imported layer in Large Map.",
    }
