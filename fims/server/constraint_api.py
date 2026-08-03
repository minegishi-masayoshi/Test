"""
FIMS Cloud Ver.3.6.0
Legacy-compatible Forest Constraint calculation API.

Endpoints:
    POST /api/constraints/calculate/province/{province}
    GET  /api/constraints/summary/province/{province}

The calculation follows the old FIMS ArcPy workflow:
- dissolve/union each constraint layer by Province;
- calculate FMU overlap area for each individual constraint;
- union the five Extreme layers and the two Serious layers so
  overlapping areas are counted once;
- update the legacy-compatible columns in public.fmu;
- save the current calculation snapshot in public.constraint_result.
"""

from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, HTTPException, Path
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter(prefix="/api/constraints", tags=["Forest Constraint Analysis"])

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

CALCULATION_VERSION = "3.6.0"

REQUIRED_TABLES = (
    "fmu",
    "extreme_slope",
    "extreme_altitude",
    "extreme_karst",
    "extreme_inundation",
    "extreme_mangrove",
    "serious_sloperelief",
    "serious_inundation",
)

CONSTRAINT_SPECS = (
    ("extreme_slope", "slope", "extreme_slope"),
    ("extreme_altitude", "altitude", "extreme_altitude"),
    ("extreme_karst", "karst", "extreme_karst"),
    ("extreme_inundation", "inundation", "extreme_inundation"),
    ("extreme_mangrove", "mangrove", "extreme_mangrove"),
    ("serious_sloperelief", "sloperelie", "serious_sloperelief"),
    ("serious_inundation", "inundati0", "serious_inundation"),
)


def _ensure_schema(connection: Any) -> None:
    connection.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS public.constraint_result (
                id                      bigserial PRIMARY KEY,
                province                integer NOT NULL,
                fmu                     bigint NOT NULL,
                zone                    integer,
                veg_type                varchar(100),
                gross_forest_area_ha    double precision DEFAULT 0,
                extreme_slope_ha        double precision DEFAULT 0,
                extreme_altitude_ha     double precision DEFAULT 0,
                extreme_karst_ha        double precision DEFAULT 0,
                extreme_inundation_ha   double precision DEFAULT 0,
                extreme_mangrove_ha     double precision DEFAULT 0,
                serious_sloperelief_ha  double precision DEFAULT 0,
                serious_inundation_ha   double precision DEFAULT 0,
                extreme_total_ha        double precision DEFAULT 0,
                serious_total_ha        double precision DEFAULT 0,
                prop_extreme            double precision DEFAULT 0,
                prop_serious            double precision DEFAULT 0,
                calculation_scope       varchar(30) NOT NULL DEFAULT 'fmu',
                calculation_version     varchar(20) NOT NULL DEFAULT '3.6.0',
                calculated_at           timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT uq_constraint_result_fmu UNIQUE (province, fmu)
            )
            """
        )
    )
    connection.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS idx_constraint_result_province
            ON public.constraint_result (province)
            """
        )
    )


def _validate_tables(connection: Any) -> None:
    rows = connection.execute(
        text(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = ANY(:table_names)
            """
        ),
        {"table_names": list(REQUIRED_TABLES)},
    ).scalars().all()

    missing = sorted(set(REQUIRED_TABLES) - set(rows))
    if missing:
        raise HTTPException(
            status_code=409,
            detail=(
                "Required PostGIS table(s) are missing: "
                + ", ".join(missing)
            ),
        )


def _union_sql(table_name: str) -> str:
    return f"""
        SELECT
            ST_Multi(
                ST_CollectionExtract(
                    ST_UnaryUnion(
                        ST_Collect(
                            ST_MakeValid(geom)
                        )
                    ),
                    3
                )
            )::geometry(MultiPolygon, 20355)
        FROM public.{table_name}
        WHERE geom IS NOT NULL
          AND (
                province IS NULL
                OR ROUND(province::numeric)::integer = :province
              )
    """


def _create_constraint_unions(connection: Any, province: int) -> None:
    connection.execute(
        text(
            """
            CREATE TEMP TABLE _fims_constraint_union (
                kind text PRIMARY KEY,
                geom geometry(MultiPolygon, 20355)
            ) ON COMMIT DROP
            """
        )
    )

    for table_name, _fmu_column, kind in CONSTRAINT_SPECS:
        geometry = connection.execute(
            text(_union_sql(table_name)),
            {"province": province},
        ).scalar_one_or_none()

        connection.execute(
            text(
                """
                INSERT INTO _fims_constraint_union (kind, geom)
                VALUES (:kind, ST_GeomFromEWKB(:geom))
                """
            ),
            {
                "kind": kind,
                "geom": bytes(geometry.data) if geometry is not None else None,
            },
        )

    connection.execute(
        text(
            """
            INSERT INTO _fims_constraint_union (kind, geom)
            SELECT
                'extreme_all',
                ST_Multi(
                    ST_CollectionExtract(
                        ST_UnaryUnion(ST_Collect(geom)),
                        3
                    )
                )::geometry(MultiPolygon, 20355)
            FROM _fims_constraint_union
            WHERE kind IN (
                'extreme_slope',
                'extreme_altitude',
                'extreme_karst',
                'extreme_inundation',
                'extreme_mangrove'
            )
              AND geom IS NOT NULL
            """
        )
    )

    connection.execute(
        text(
            """
            INSERT INTO _fims_constraint_union (kind, geom)
            SELECT
                'serious_all',
                ST_Multi(
                    ST_CollectionExtract(
                        ST_UnaryUnion(ST_Collect(geom)),
                        3
                    )
                )::geometry(MultiPolygon, 20355)
            FROM _fims_constraint_union
            WHERE kind IN (
                'serious_sloperelief',
                'serious_inundation'
            )
              AND geom IS NOT NULL
            """
        )
    )


UPDATE_SQL = """
WITH geometries AS (
    SELECT
        MAX(geom) FILTER (WHERE kind = 'extreme_slope') AS extreme_slope,
        MAX(geom) FILTER (WHERE kind = 'extreme_altitude') AS extreme_altitude,
        MAX(geom) FILTER (WHERE kind = 'extreme_karst') AS extreme_karst,
        MAX(geom) FILTER (WHERE kind = 'extreme_inundation') AS extreme_inundation,
        MAX(geom) FILTER (WHERE kind = 'extreme_mangrove') AS extreme_mangrove,
        MAX(geom) FILTER (WHERE kind = 'serious_sloperelief') AS serious_sloperelief,
        MAX(geom) FILTER (WHERE kind = 'serious_inundation') AS serious_inundation,
        MAX(geom) FILTER (WHERE kind = 'extreme_all') AS extreme_all,
        MAX(geom) FILTER (WHERE kind = 'serious_all') AS serious_all
    FROM _fims_constraint_union
),
calculated AS (
    SELECT
        f.id,
        COALESCE(
            ST_Area(ST_Intersection(ST_MakeValid(f.geom), g.extreme_slope)) / 10000.0,
            0
        ) AS slope,
        COALESCE(
            ST_Area(ST_Intersection(ST_MakeValid(f.geom), g.extreme_altitude)) / 10000.0,
            0
        ) AS altitude,
        COALESCE(
            ST_Area(ST_Intersection(ST_MakeValid(f.geom), g.extreme_karst)) / 10000.0,
            0
        ) AS karst,
        COALESCE(
            ST_Area(ST_Intersection(ST_MakeValid(f.geom), g.extreme_inundation)) / 10000.0,
            0
        ) AS inundation,
        COALESCE(
            ST_Area(ST_Intersection(ST_MakeValid(f.geom), g.extreme_mangrove)) / 10000.0,
            0
        ) AS mangrove,
        COALESCE(
            ST_Area(ST_Intersection(ST_MakeValid(f.geom), g.serious_sloperelief)) / 10000.0,
            0
        ) AS sloperelie,
        COALESCE(
            ST_Area(ST_Intersection(ST_MakeValid(f.geom), g.serious_inundation)) / 10000.0,
            0
        ) AS inundati0,
        COALESCE(
            ST_Area(ST_Intersection(ST_MakeValid(f.geom), g.extreme_all)) / 10000.0,
            0
        ) AS extreme_area,
        COALESCE(
            ST_Area(ST_Intersection(ST_MakeValid(f.geom), g.serious_all)) / 10000.0,
            0
        ) AS serious_area
    FROM public.fmu f
    CROSS JOIN geometries g
    WHERE f.province = :province
      AND f.geom IS NOT NULL
)
UPDATE public.fmu f
SET
    slope       = c.slope,
    altitude    = c.altitude,
    karst       = c.karst,
    inundation  = c.inundation,
    mangrove    = c.mangrove,
    sloperelie  = c.sloperelie,
    inundati0   = c.inundati0,
    area        = c.extreme_area,
    area0       = c.serious_area,
    extreme     = CASE
                    WHEN COALESCE(f.veg_area, 0) > 0
                    THEN c.extreme_area / f.veg_area * 100.0
                    ELSE 0
                  END,
    serious     = CASE
                    WHEN COALESCE(f.veg_area, 0) > 0
                    THEN c.serious_area / f.veg_area * 100.0
                    ELSE 0
                  END
FROM calculated c
WHERE f.id = c.id
RETURNING f.id
"""


SNAPSHOT_SQL = """
INSERT INTO public.constraint_result (
    province,
    fmu,
    zone,
    veg_type,
    gross_forest_area_ha,
    extreme_slope_ha,
    extreme_altitude_ha,
    extreme_karst_ha,
    extreme_inundation_ha,
    extreme_mangrove_ha,
    serious_sloperelief_ha,
    serious_inundation_ha,
    extreme_total_ha,
    serious_total_ha,
    prop_extreme,
    prop_serious,
    calculation_scope,
    calculation_version,
    calculated_at
)
SELECT
    province,
    fmu,
    zone,
    veg_type,
    COALESCE(veg_area, 0),
    COALESCE(slope, 0),
    COALESCE(altitude, 0),
    COALESCE(karst, 0),
    COALESCE(inundation, 0),
    COALESCE(mangrove, 0),
    COALESCE(sloperelie, 0),
    COALESCE(inundati0, 0),
    COALESCE(area, 0),
    COALESCE(area0, 0),
    COALESCE(extreme, 0),
    COALESCE(serious, 0),
    'fmu',
    :calculation_version,
    now()
FROM public.fmu
WHERE province = :province
ON CONFLICT (province, fmu)
DO UPDATE SET
    zone                    = EXCLUDED.zone,
    veg_type                = EXCLUDED.veg_type,
    gross_forest_area_ha    = EXCLUDED.gross_forest_area_ha,
    extreme_slope_ha        = EXCLUDED.extreme_slope_ha,
    extreme_altitude_ha     = EXCLUDED.extreme_altitude_ha,
    extreme_karst_ha        = EXCLUDED.extreme_karst_ha,
    extreme_inundation_ha   = EXCLUDED.extreme_inundation_ha,
    extreme_mangrove_ha     = EXCLUDED.extreme_mangrove_ha,
    serious_sloperelief_ha  = EXCLUDED.serious_sloperelief_ha,
    serious_inundation_ha   = EXCLUDED.serious_inundation_ha,
    extreme_total_ha        = EXCLUDED.extreme_total_ha,
    serious_total_ha        = EXCLUDED.serious_total_ha,
    prop_extreme            = EXCLUDED.prop_extreme,
    prop_serious            = EXCLUDED.prop_serious,
    calculation_scope       = EXCLUDED.calculation_scope,
    calculation_version     = EXCLUDED.calculation_version,
    calculated_at           = EXCLUDED.calculated_at
"""


SUMMARY_SQL = """
SELECT
    :province::integer AS province,
    COUNT(*)::integer AS fmu_count,
    COALESCE(SUM(veg_area), 0)::double precision AS gross_forest_area_ha,
    COALESCE(SUM(slope), 0)::double precision AS extreme_slope_ha,
    COALESCE(SUM(altitude), 0)::double precision AS extreme_altitude_ha,
    COALESCE(SUM(karst), 0)::double precision AS extreme_karst_ha,
    COALESCE(SUM(inundation), 0)::double precision AS extreme_inundation_ha,
    COALESCE(SUM(mangrove), 0)::double precision AS extreme_mangrove_ha,
    COALESCE(SUM(sloperelie), 0)::double precision AS serious_sloperelief_ha,
    COALESCE(SUM(inundati0), 0)::double precision AS serious_inundation_ha,
    COALESCE(SUM(area), 0)::double precision AS extreme_total_ha,
    COALESCE(SUM(area0), 0)::double precision AS serious_total_ha,
    CASE
        WHEN COALESCE(SUM(veg_area), 0) > 0
        THEN COALESCE(SUM(area), 0) / SUM(veg_area) * 100.0
        ELSE 0
    END::double precision AS prop_extreme,
    CASE
        WHEN COALESCE(SUM(veg_area), 0) > 0
        THEN COALESCE(SUM(area0), 0) / SUM(veg_area) * 100.0
        ELSE 0
    END::double precision AS prop_serious,
    MAX(calculated_at) AS calculated_at
FROM public.fmu f
LEFT JOIN public.constraint_result r
  ON r.province = f.province
 AND r.fmu = f.fmu
WHERE f.province = :province
"""


def _summary(connection: Any, province: int) -> dict[str, Any]:
    row = connection.execute(
        text(SUMMARY_SQL),
        {"province": province},
    ).mappings().one()
    result = dict(row)
    if result.get("calculated_at") is not None:
        result["calculated_at"] = result["calculated_at"].isoformat()
    return result


@router.get("/summary/province/{province}")
def get_constraint_summary(
    province: int = Path(..., ge=1, le=999),
) -> dict[str, Any]:
    try:
        with engine.begin() as connection:
            _ensure_schema(connection)
            return {
                "status": "ok",
                "calculation_version": CALCULATION_VERSION,
                "summary": _summary(connection, province),
            }
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=500,
            detail=f"Constraint summary failed: {error}",
        ) from error


@router.post("/calculate/province/{province}")
def calculate_constraints(
    province: int = Path(..., ge=1, le=999),
) -> dict[str, Any]:
    try:
        with engine.begin() as connection:
            _ensure_schema(connection)
            _validate_tables(connection)

            fmu_count = connection.execute(
                text(
                    """
                    SELECT COUNT(*)
                    FROM public.fmu
                    WHERE province = :province
                    """
                ),
                {"province": province},
            ).scalar_one()

            if fmu_count == 0:
                raise HTTPException(
                    status_code=404,
                    detail=f"No FMUs were found for Province {province}.",
                )

            _create_constraint_unions(connection, province)

            updated_ids = connection.execute(
                text(UPDATE_SQL),
                {"province": province},
            ).scalars().all()

            connection.execute(
                text(SNAPSHOT_SQL),
                {
                    "province": province,
                    "calculation_version": CALCULATION_VERSION,
                },
            )

            summary = _summary(connection, province)

        return {
            "status": "ok",
            "province": province,
            "updated_fmu_count": len(updated_ids),
            "calculation_version": CALCULATION_VERSION,
            "method": {
                "individual_constraints": "FMU intersection with dissolved constraint geometry",
                "extreme_total": "Union of five Extreme layers; overlaps counted once",
                "serious_total": "Union of two Serious layers; overlaps counted once",
                "area_unit": "ha",
                "proportion": "union area / vegetation area * 100",
            },
            "summary": summary,
            "next_action": "Review Results and refresh the Province Summary.",
        }
    except HTTPException:
        raise
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=500,
            detail=f"Constraint calculation failed: {error}",
        ) from error
