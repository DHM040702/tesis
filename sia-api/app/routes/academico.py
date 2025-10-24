# app/routers/academico.py
from __future__ import annotations
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from ..db import get_session
from ..deps import require_roles
from ..schemas import ApiResponse

router = APIRouter(prefix="/academico", tags=["evidencia_academica"])


# =========================
# 1️⃣ MATRÍCULAS
# =========================
@router.get("/{id_estudiante}/matriculas", response_model=ApiResponse,
             dependencies=[Depends(require_roles("admin","autoridad","tutor"))])
async def matriculas_estudiante(
    id_estudiante: int,
    id_periodo: int = Query(..., ge=1),
    db: AsyncSession = Depends(get_session)
):
    """
    Retorna las asignaturas matriculadas por un estudiante en un periodo determinado.
    Muestra: curso, créditos, docente, asistencia registrada, estado (regular, retirado, etc.)
    """
    q = text("""
        SELECT
            m.id_matricula,
            c.nombre AS curso,
            c.creditos,
            d.id_docente,
            CONCAT_WS(' ', p.apellido_paterno, p.apellido_materno, p.nombres) AS docente,
            m.estado_matricula,
            m.fecha_matricula
        FROM matriculas m
        JOIN cursos c       ON c.id_curso = m.id_curso
        JOIN docentes d     ON d.id_docente = m.id_docente
        JOIN personas p     ON p.id_persona = d.id_persona
        WHERE m.id_estudiante = :est AND m.id_periodo = :per
        ORDER BY c.nombre ASC
    """)
    res = await db.execute(q, {"est": id_estudiante, "per": id_periodo})
    data = [dict(r._mapping) for r in res.fetchall()]
    if not data:
        raise HTTPException(status_code=404, detail="No se encontraron matrículas para el periodo indicado")
    return {"ok": True, "data": data}


# =========================
# 2️⃣ ASISTENCIAS
# =========================
@router.get("/{id_estudiante}/asistencias", response_model=ApiResponse,
             dependencies=[Depends(require_roles("admin","autoridad","tutor"))])
async def asistencias_estudiante(
    id_estudiante: int,
    id_periodo: int = Query(..., ge=1),
    db: AsyncSession = Depends(get_session)
):
    """
    Devuelve el resumen de asistencias del estudiante por curso y porcentaje.
    Se espera que la tabla `asistencias` tenga (id_estudiante, id_curso, asistencias, faltas, total_sesiones).
    """
    q = text("""
        SELECT
            c.nombre AS curso,
            a.asistencias,
            a.faltas,
            a.total_sesiones,
            ROUND((a.asistencias / NULLIF(a.total_sesiones,0)) * 100, 2) AS porcentaje_asistencia
        FROM asistencias a
        JOIN cursos c ON c.id_curso = a.id_curso
        WHERE a.id_estudiante = :est AND a.id_periodo = :per
        ORDER BY c.nombre ASC
    """)
    res = await db.execute(q, {"est": id_estudiante, "per": id_periodo})
    data = [dict(r._mapping) for r in res.fetchall()]
    if not data:
        raise HTTPException(status_code=404, detail="No se encontraron registros de asistencia")
    return {"ok": True, "data": data}


# =========================
# 3️⃣ CALIFICACIONES
# =========================
@router.get("/{id_estudiante}/calificaciones", response_model=ApiResponse,
             dependencies=[Depends(require_roles("admin","autoridad","tutor"))])
async def calificaciones_estudiante(
    id_estudiante: int,
    id_periodo: int = Query(..., ge=1),
    db: AsyncSession = Depends(get_session)
):
    """
    Devuelve las calificaciones del estudiante en cada curso y el promedio general.
    La tabla `calificaciones` contiene (id_estudiante, id_curso, nota_final, id_periodo).
    """
    q = text("""
        SELECT
            c.nombre AS curso,
            c.creditos,
            cal.nota_final,
            CASE
              WHEN cal.nota_final >= 13 THEN 'Aprobado'
              WHEN cal.nota_final IS NULL THEN 'Pendiente'
              ELSE 'Desaprobado'
            END AS estado
        FROM calificaciones cal
        JOIN cursos c ON c.id_curso = cal.id_curso
        WHERE cal.id_estudiante = :est AND cal.id_periodo = :per
        ORDER BY c.nombre ASC
    """)
    res = await db.execute(q, {"est": id_estudiante, "per": id_periodo})
    rows = res.fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="No se encontraron calificaciones para este periodo")

    # Calcular promedio general ponderado
    notas_validas = [r.nota_final for r in rows if r.nota_final is not None]
    promedio = round(sum(notas_validas) / len(notas_validas), 2) if notas_validas else None

    data = [dict(r._mapping) for r in rows]
    return {
        "ok": True,
        "data": {
            "detalle": data,
            "promedio_general": promedio
        }
    }
