# app/routers/fse.py
from __future__ import annotations
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import require_roles
from ..schemas import ApiResponse

router = APIRouter(prefix="/fse", tags=["ficha_socioeconomica"])


# =========================
# Esquemas de entrada
# =========================

class FichaNuevaIn(BaseModel):
    id_periodo: int = Field(..., ge=1)
    observaciones: Optional[str] = None


# =========================
# Helpers SQL
# =========================

SQL_EXISTE_ESTUDIANTE = text("""
    SELECT 1 FROM estudiantes WHERE id_estudiante=:id LIMIT 1
""")

SQL_EXISTE_PERIODO = text("""
    SELECT 1 FROM periodos_academicos WHERE id_periodo=:id LIMIT 1
""")

SQL_EXISTE_FICHA = text("""
    SELECT id_ficha FROM fichas_socioeconomicas
    WHERE id_estudiante=:est AND id_periodo=:per
    LIMIT 1
""")

SQL_INSERT_FICHA = text("""
    INSERT INTO fichas_socioeconomicas (id_estudiante, id_periodo, observaciones)
    VALUES (:est, :per, :obs)
""")

SQL_SELECT_ID_FICHA_RECIENTE = text("""
    SELECT id_ficha
    FROM fichas_socioeconomicas
    WHERE id_estudiante=:est AND id_periodo=:per
    ORDER BY id_ficha DESC
    LIMIT 1
""")

SQL_ITEM_CLAS = text("""
    SELECT id_item FROM items_fse WHERE codigo='CLAS' LIMIT 1
""")

SQL_UPSERT_RESP_CLAS = text("""
    INSERT INTO respuestas_fse (id_ficha, id_item, puntos)
    VALUES (:idf, :idi, 0)
    ON DUPLICATE KEY UPDATE puntos=VALUES(puntos)
""")

SQL_RESUMEN_FICHA = text("""
    SELECT *
    FROM v_resumen_ficha
    WHERE id_ficha=:idf
    LIMIT 1
""")


# =========================
# Endpoints
# =========================

@router.post(
    "/{id_estudiante}/nueva",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "autoridad"))],
)
async def crear_ficha(
    id_estudiante: int,
    payload: FichaNuevaIn,
    db: AsyncSession = Depends(get_session),
):
    """
    Crea una ficha socioeconómica para el estudiante y periodo indicados.
    - Valida existencia de estudiante y periodo.
    - Impide duplicados (par único id_estudiante + id_periodo).
    - Crea/asegura respuesta placeholder del ítem 'CLAS' (clasificación).
    """
    # 1) Validaciones de existencia
    if not (await db.execute(SQL_EXISTE_ESTUDIANTE, {"id": id_estudiante})).fetchone():
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    if not (await db.execute(SQL_EXISTE_PERIODO, {"id": payload.id_periodo})).fetchone():
        raise HTTPException(status_code=404, detail="Periodo no encontrado")

    # 2) Evitar duplicados
    dup = (await db.execute(SQL_EXISTE_FICHA, {"est": id_estudiante, "per": payload.id_periodo})).fetchone()
    if dup:
        raise HTTPException(status_code=409, detail="Ya existe una ficha para este estudiante en ese periodo")

    # 3) Insertar ficha
    try:
        await db.execute(
            SQL_INSERT_FICHA,
            {"est": id_estudiante, "per": payload.id_periodo, "obs": payload.observaciones},
        )
        await db.commit()
    except Exception as ex:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"No se pudo crear la ficha: {ex}")

    # 4) Obtener id_ficha recién creada
    row = (await db.execute(
        SQL_SELECT_ID_FICHA_RECIENTE, {"est": id_estudiante, "per": payload.id_periodo}
    )).fetchone()
    id_ficha = int(row.id_ficha)

    # 5) Asegurar respuesta placeholder del ítem CLAS (si existe el ítem)
    item_clas = (await db.execute(SQL_ITEM_CLAS)).fetchone()
    if item_clas:
        await db.execute(SQL_UPSERT_RESP_CLAS, {"idf": id_ficha, "idi": int(item_clas.id_item)})
        await db.commit()

    return {
        "ok": True,
        "message": "Ficha creada",
        "data": {"id_ficha": id_ficha, "id_estudiante": id_estudiante, "id_periodo": payload.id_periodo},
    }


@router.post(
    "/{id_ficha}/recalcular",
    response_model=ApiResponse,
    dependencies=[Depends(require_roles("admin", "autoridad"))],
)
async def recalcular_ficha(
    id_ficha: int,
    db: AsyncSession = Depends(get_session),
):
    """
    Recalcula puntajes de la ficha (puntos por ítem y clasificación final)
    usando el procedimiento almacenado `sp_recalcular_ficha_fse`.
    """
    # Verifica que exista la ficha
    ex = await db.execute(text("SELECT id_ficha FROM fichas_socioeconomicas WHERE id_ficha=:idf"), {"idf": id_ficha})
    if not ex.fetchone():
        raise HTTPException(status_code=404, detail="Ficha no encontrada")

    try:
        await db.execute(text("CALL sp_recalcular_ficha_fse(:idf)"), {"idf": id_ficha})
        await db.commit()
    except Exception as ex:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"No se pudo recalcular la ficha: {ex}")

    return {"ok": True, "message": "Ficha recalculada", "data": {"id_ficha": id_ficha}}


@router.get(
    "/{id_ficha}/resumen",
    response_model=ApiResponse,
    dependencies=[Depends(require_roles("admin", "autoridad", "tutor"))],
)
async def resumen_ficha(
    id_ficha: int,
    db: AsyncSession = Depends(get_session),
):
    """
    Devuelve un resumen legible de la ficha desde la vista `v_resumen_ficha`.
    Incluye: estudiante (desde PERSONAS), periodo, total de puntos, clasificación
    y los detalles principales del resumen (PROC, VIVI, PROM, etc.).
    """
    row = (await db.execute(SQL_RESUMEN_FICHA, {"idf": id_ficha})).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Resumen no disponible (ficha inexistente o sin datos)")

    return {"ok": True, "data": dict(row._mapping)}
