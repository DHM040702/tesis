# app/routers/alertas.py
from __future__ import annotations
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from ..db import get_session
from ..deps import require_roles
from ..schemas import ApiResponse

router = APIRouter(prefix="/alertas", tags=["alertas"])


# =========================
# Esquemas Pydantic
# =========================

class AlertaUpdate(BaseModel):
    leida: Optional[bool] = Field(None, description="Marcar alerta como leída/no leída")
    observacion: Optional[str] = Field(None, max_length=300, description="Comentario o seguimiento de la alerta")


# =========================
# GET: Listar alertas
# =========================

@router.get("/", response_model=ApiResponse, dependencies=[Depends(require_roles("admin","autoridad","tutor"))])
async def listar_alertas(
    id_estudiante: Optional[int] = Query(None, description="Filtrar por estudiante"),
    id_periodo: Optional[int] = Query(None, description="Filtrar por periodo académico"),
    leida: Optional[bool] = Query(None, description="Filtrar por estado de lectura"),
    db: AsyncSession = Depends(get_session),
):
    """
    Lista las alertas generadas por el sistema, con filtros opcionales:
      - estudiante (id_estudiante)
      - periodo (id_periodo)
      - estado de lectura (leida)
    Devuelve el nombre del estudiante, tipo, severidad, descripción y fecha.
    """
    sql = """
        SELECT 
            a.id_alerta,
            e.id_estudiante,
            p.dni,
            CONCAT_WS(' ', p.apellido_paterno, p.apellido_materno, ',', p.nombres) AS estudiante,
            pa.nombre AS periodo,
            ta.nombre AS tipo_alerta,
            s.nombre AS severidad,
            a.descripcion,
            a.leida,
            a.observacion,
            DATE_FORMAT(a.creado_en, '%Y-%m-%d %H:%i') AS fecha_creacion
        FROM alertas a
        JOIN estudiantes e       ON e.id_estudiante = a.id_estudiante
        LEFT JOIN personas p     ON p.id_persona    = e.id_persona
        LEFT JOIN periodos_academicos pa ON pa.id_periodo = a.id_periodo
        LEFT JOIN tipos_alerta ta ON ta.id_tipo_alerta = a.id_tipo_alerta
        LEFT JOIN severidades s   ON s.id_severidad = a.id_severidad
        WHERE 1=1
    """
    params = {}
    if id_estudiante:
        sql += " AND a.id_estudiante = :est"
        params["est"] = id_estudiante
    if id_periodo:
        sql += " AND a.id_periodo = :per"
        params["per"] = id_periodo
    if leida is not None:
        sql += " AND a.leida = :lei"
        params["lei"] = 1 if leida else 0

    sql += " ORDER BY a.creado_en DESC"

    res = await db.execute(text(sql), params)
    data = [dict(r._mapping) for r in res.fetchall()]
    return {"ok": True, "data": data}


# =========================
# PATCH: Actualizar alerta
# =========================

@router.patch("/{id_alerta}", response_model=ApiResponse, dependencies=[Depends(require_roles("admin","autoridad","tutor"))])
async def actualizar_alerta(
    id_alerta: int,
    payload: AlertaUpdate,
    db: AsyncSession = Depends(get_session),
):
    """
    Permite marcar una alerta como leída/no leída y/o agregar observaciones.
    No permite modificar campos estructurales (tipo, severidad, estudiante, etc.).
    """
    # Verificar existencia
    q = text("SELECT id_alerta FROM alertas WHERE id_alerta=:id LIMIT 1")
    ex = (await db.execute(q, {"id": id_alerta})).fetchone()
    if not ex:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    updates = []
    params = {"id": id_alerta}

    if payload.leida is not None:
        updates.append("leida = :leida")
        params["leida"] = 1 if payload.leida else 0
    if payload.observacion is not None:
        updates.append("observacion = :obs")
        params["obs"] = payload.observacion.strip()

    if not updates:
        raise HTTPException(status_code=400, detail="No hay cambios para aplicar")

    try:
        await db.execute(text(f"UPDATE alertas SET {', '.join(updates)} WHERE id_alerta=:id"), params)
        await db.commit()
    except Exception as ex:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"No se pudo actualizar la alerta: {ex}")

    # Retornar alerta actualizada
    q_final = text("""
        SELECT a.id_alerta, a.id_estudiante, a.leida, a.observacion,
               DATE_FORMAT(a.creado_en, '%Y-%m-%d %H:%i') AS fecha_creacion
        FROM alertas a WHERE a.id_alerta=:id
    """)
    row = (await db.execute(q_final, {"id": id_alerta})).fetchone()
    return {"ok": True, "message": "Alerta actualizada", "data": dict(row._mapping)}
