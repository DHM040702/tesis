# app/routers/estudiantes.py
from __future__ import annotations
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from ..db import get_session
from ..deps import require_roles
from ..schemas import ApiResponse
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

# ===========================
# MODELOS DE RESPUESTA
# ===========================

class EstudianteItem(BaseModel):
    id_estudiante: int
    codigo_alumno: str
    dni: Optional[str] = None
    apellido_paterno: Optional[str] = None
    apellido_materno: Optional[str] = None
    nombres: Optional[str] = None
    programa: Optional[str] = None
    puntaje: Optional[float] = None
    nivel: Optional[str] = None


class DataResponse(BaseModel):
    items: List[EstudianteItem]
    total: int
    page_size: int


class ApiResponse(BaseModel):
    ok: bool
    data: DataResponse


router = APIRouter(prefix="/estudiantes", tags=["estudiantes"])

@router.get("/", response_model=ApiResponse, dependencies=[Depends(require_roles("admin","autoridad","tutor","docente"))])
async def listar(
    programa: int | None = Query(None),
    periodo: int | None = Query(None),
    riesgo: str | None = Query(None),
    termino: str | None = Query(
        None,
        min_length=2,
        description="Buscar por DNI o nombres del estudiante"
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=10, le=40, description="Cantidad de estudiantes por página"),
    db: AsyncSession = Depends(get_session)
):
    if page_size not in {10, 20, 30, 40}:
        page_size = 20

    sql_from = """
      FROM estudiantes e
      LEFT JOIN personas p ON p.id_persona=e.id_persona
      LEFT JOIN programas prog ON prog.id_programa=e.id_programa
      LEFT JOIN puntajes_riesgo pr ON pr.id_estudiante=e.id_estudiante
      LEFT JOIN niveles_riesgo nr ON nr.id_nivel_riesgo=pr.id_nivel_riesgo
      WHERE 1=1
    """
    filters_sql = ""
    params: dict[str, int | str] = {}
    if programa:
        filters_sql += " AND e.id_programa=:prog"
        params["prog"] = programa
    if periodo:
        filters_sql += " AND pr.id_periodo=:per"
        params["per"] = periodo
    if riesgo:
        filters_sql += " AND nr.nombre=:niv"
        params["niv"] = riesgo
    if termino:
        filters_sql += " AND (p.dni LIKE '%:term%' OR CONCAT_WS(' ', p.apellido_paterno, p.apellido_materno, p.nombres) LIKE '%:term%')"
        params["term"] = f"%{termino.strip()}%"
    
    offset = (page - 1) * page_size
    data_query = text(
        """
      SELECT e.id_estudiante, e.codigo_alumno,
             p.dni, p.apellido_paterno, p.apellido_materno, p.nombres,
             prog.nombre AS programa,
             pr.puntaje, nr.nombre AS nivel
    """
        + sql_from
        + filters_sql
        + " ORDER BY pr.puntaje IS NULL, pr.puntaje ASC, p.apellido_paterno ASC, p.apellido_materno ASC, p.nombres ASC"
        + " LIMIT :limit OFFSET :offset"
    )
    data_params = {**params, "limit": page_size, "offset": offset}
    res = await db.execute(data_query, data_params)
    rows = [dict(r._mapping) for r in res.fetchall()]

    count_query = text("SELECT COUNT(DISTINCT e.id_estudiante) " + sql_from + filters_sql)
    total = (await db.execute(count_query, params)).scalar_one()

    return {
        "ok": True,
        "data": {
            "items": rows,
            "total": total,
            "page": page,
            "page_size": page_size,
        },
    }

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

@router.get(
    "/codigo/",
    dependencies=[Depends(require_roles("admin","autoridad","tutor"))]
)
async def detalle_por_codigo(
    codigo: str = Query(
        ...,
        min_length=2,
        description="Buscar coincidencias por codigo de alumno",
    ),
    max_alumnos: int = Query(
        5,
        ge=1,
        le=50,
        description="Maximo de alumnos a devolver (por defecto 20, maximo 50)",
    ),
    db: AsyncSession = Depends(get_session),
):
    busq_cod = f"%{codigo}%"

    q1 = text("""
      SELECT e.id_estudiante,
             e.codigo_alumno,
             e.id_programa,
             e.anio_ingreso,
             e.id_estado_academico,
             p.dni,
             p.apellido_paterno,
             p.apellido_materno,
             p.nombres,
             prog.nombre AS programa
      FROM estudiantes e
      LEFT JOIN personas p ON p.id_persona = e.id_persona
      LEFT JOIN programas prog ON prog.id_programa = e.id_programa
      WHERE e.codigo_alumno LIKE :cod OR p.dni LIKE :cod OR p.apellido_paterno LIKE :cod
      ORDER BY e.codigo_alumno
      LIMIT :limit
    """)

    res = await db.execute(q1, {"cod": busq_cod, "limit": max_alumnos})
    filas = res.fetchall()

    estudiantes = [dict(f._mapping) for f in filas]

    return {
        "ok": True,
        "data": {
            "estudiantes": estudiantes,
            "total_encontrados": len(estudiantes),
            "max_alumnos": max_alumnos,
        },
    }
