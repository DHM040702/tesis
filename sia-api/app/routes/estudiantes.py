# app/routers/estudiantes.py
from __future__ import annotations
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from ..db import get_session
from ..deps import require_roles
from ..schemas import ApiResponse

router = APIRouter(prefix="/estudiantes", tags=["estudiantes"])

@router.get("/", response_model=ApiResponse, dependencies=[Depends(require_roles("admin","autoridad","tutor"))])
async def listar(
    programa: int | None = Query(None),
    periodo: int | None = Query(None),
    riesgo: str | None = Query(None),
    db: AsyncSession = Depends(get_session)
):
    sql = """
      SELECT e.id_estudiante, e.codigo_alumno,
             p.dni, p.apellido_paterno, p.apellido_materno, p.nombres,
             prog.nombre AS programa,
             pr.puntaje, nr.nombre AS nivel
      FROM estudiantes e
      LEFT JOIN personas p ON p.id_persona=e.id_persona
      LEFT JOIN programas prog ON prog.id_programa=e.id_programa
      LEFT JOIN puntajes_riesgo pr ON pr.id_estudiante=e.id_estudiante
      LEFT JOIN niveles_riesgo nr ON nr.id_nivel_riesgo=pr.id_nivel_riesgo
      WHERE 1=1
    """
    params = {}
    if programa:
        sql += " AND e.id_programa=:prog"
        params["prog"] = programa
    if periodo:
        sql += " AND pr.id_periodo=:per"
        params["per"] = periodo
    if riesgo:
        sql += " AND nr.nombre=:niv"
        params["niv"] = riesgo
    sql += " ORDER BY pr.puntaje IS NULL, pr.puntaje ASC, p.apellido_paterno ASC, p.apellido_materno ASC, p.nombres ASC"
    res = await db.execute(text(sql), params)
    return {"ok": True, "data": [dict(r._mapping) for r in res.fetchall()]}

@router.get("/{id_estudiante}", response_model=ApiResponse, dependencies=[Depends(require_roles("admin","autoridad","tutor"))])
async def detalle(id_estudiante: int, db: AsyncSession = Depends(get_session)):
    q1 = text("""
      SELECT e.id_estudiante, e.codigo_alumno, e.id_programa, e.anio_ingreso, e.id_estado_academico,
             p.dni, p.apellido_paterno, p.apellido_materno, p.nombres,
             prog.nombre AS programa
      FROM estudiantes e
      LEFT JOIN personas p ON p.id_persona=e.id_persona
      LEFT JOIN programas prog ON prog.id_programa=e.id_programa
      WHERE e.id_estudiante=:id
    """)
    q2 = text("""
      SELECT pr.*, nr.nombre AS nivel
      FROM puntajes_riesgo pr JOIN niveles_riesgo nr ON nr.id_nivel_riesgo=pr.id_nivel_riesgo
      WHERE pr.id_estudiante=:id ORDER BY pr.creado_en DESC
    """)
    q3 = text("""
      SELECT a.*, ta.nombre AS tipo, s.nombre AS severidad
      FROM alertas a JOIN tipos_alerta ta ON ta.id_tipo_alerta=a.id_tipo_alerta
                     JOIN severidades s ON s.id_severidad=a.id_severidad
      WHERE a.id_estudiante=:id ORDER BY a.creado_en DESC
    """)
    est = (await db.execute(q1, {"id": id_estudiante})).fetchone()
    riesgos = (await db.execute(q2, {"id": id_estudiante})).fetchall()
    alertas = (await db.execute(q3, {"id": id_estudiante})).fetchall()
    return {"ok": True, "data": {
        "estudiante": dict(est._mapping) if est else None,
        "riesgos": [dict(r._mapping) for r in riesgos],
        "alertas": [dict(a._mapping) for a in alertas]
    }}
