# app/routers/riesgo.py
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from ..db import get_session
from ..deps import require_roles
from ..schemas import ApiResponse

router = APIRouter(prefix="/riesgo", tags=["riesgo"])

@router.post("/recalcular", response_model=ApiResponse, dependencies=[Depends(require_roles("admin","autoridad"))])
async def recalcular(id_periodo: int, db: AsyncSession = Depends(get_session)):
    await db.execute(text("CALL sp_recalcular_riesgo_periodo(:p)"), {"p": id_periodo})
    await db.commit()
    return {"ok": True, "message": "Riesgo recalculado"}

@router.post("/alertas", response_model=ApiResponse, dependencies=[Depends(require_roles("admin","autoridad"))])
async def generar_alertas(id_periodo: int, db: AsyncSession = Depends(get_session)):
    await db.execute(text("CALL sp_generar_alertas_periodo(:p)"), {"p": id_periodo})
    await db.commit()
    return {"ok": True, "message": "Alertas generadas"}

@router.get("/resumen", response_model=ApiResponse, dependencies=[Depends(require_roles("admin","autoridad","tutor"))])
async def resumen(id_periodo: int, id_programa: int | None = None, db: AsyncSession = Depends(get_session)):
    sql = """
      SELECT pr.id_estudiante,
             p.dni,
             CONCAT_WS(' ', p.apellido_paterno, p.apellido_materno, ',', p.nombres) AS nombre_visible,
             e.id_programa, prog.nombre AS programa,
             pr.puntaje, nr.nombre AS nivel, pr.factores_json, pr.creado_en
      FROM puntajes_riesgo pr
      JOIN estudiantes e ON e.id_estudiante=pr.id_estudiante
      LEFT JOIN personas p ON p.id_persona=e.id_persona
      LEFT JOIN programas prog ON prog.id_programa=e.id_programa
      JOIN niveles_riesgo nr ON nr.id_nivel_riesgo=pr.id_nivel_riesgo
      WHERE pr.id_periodo=:per
    """
    params = {"per": id_periodo}
    if id_programa:
        sql += " AND e.id_programa=:prog"
        params["prog"] = id_programa
    sql += " ORDER BY pr.puntaje ASC, p.apellido_paterno ASC, p.apellido_materno ASC, p.nombres ASC"
    res = await db.execute(text(sql), params)
    return {"ok": True, "data": [dict(r._mapping) for r in res.fetchall()]}
