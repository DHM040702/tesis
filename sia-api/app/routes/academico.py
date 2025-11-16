# app/routers/academico.py
from __future__ import annotations
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from ..db import get_session
from ..deps import require_roles
from ..schemas import ApiResponse

router = APIRouter(prefix="/academico", tags=["evidencia_academica"])


# ============================================================
# MATRÍCULAS — cursos matriculados por estudiante/periodo
# ============================================================
@router.get(
    "/{id_estudiante}/matriculas",
    response_model=ApiResponse,
    dependencies=[Depends(require_roles("admin", "autoridad", "tutor"))],
)
async def matriculas_estudiante(
    id_estudiante: int,
    id_periodo: int = Query(..., ge=1, description="ID del periodo académico"),
    db: AsyncSession = Depends(get_session),
):
    """
    Retorna las asignaturas matriculadas por un estudiante en un periodo determinado.
    Incluye: curso, créditos, docente, estado y fecha de matrícula.
    """
    q = text("""
        SELECT
            m.id_matricula,
            c.nombre AS curso,
            c.creditos,
            d.id_docente,
            CONCAT_WS(' ', pd.apellido_paterno, pd.apellido_materno, pd.nombres) AS docente,
            em.nombre AS estado_matricula,
            m.fecha_matricula
        FROM matriculas m
        JOIN cursos c               ON c.id_curso = m.id_curso
        LEFT JOIN docentes d        ON d.id_docente = m.id_docente
        LEFT JOIN personas pd       ON pd.id_persona = d.id_persona
        JOIN estados_matricula em   ON em.id_estado_matricula = m.id_estado_matricula
        WHERE m.id_estudiante = :est AND m.id_periodo = :per
        ORDER BY c.nombre ASC
    """)

    res = await db.execute(q, {"est": id_estudiante, "per": id_periodo})
    rows = res.mappings().all()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="No se encontraron matrículas para el periodo indicado",
        )

    return {"ok": True, "data": [dict(r) for r in rows]}


# ============================================================
# ASISTENCIAS — resumen de asistencia por curso (AGREGADO)
# ============================================================
@router.get(
    "/{id_estudiante}/asistencias",
    response_model=ApiResponse,
    dependencies=[Depends(require_roles("admin", "autoridad", "tutor"))],
)
async def asistencias_estudiante(
    id_estudiante: int,
    id_periodo: int = Query(..., ge=1, description="ID del periodo académico"),
    db: AsyncSession = Depends(get_session),
):
    """
    Devuelve el resumen de asistencias del estudiante por curso con porcentaje.
    Calcula a partir de la tabla de detalle `asistencias` (presente/falta por sesión).
    """
    q = text("""
        SELECT
            c.nombre AS curso,
            SUM(CASE WHEN a.presente = 1 THEN 1 ELSE 0 END) AS asistencias,
            SUM(CASE WHEN a.presente = 0 THEN 1 ELSE 0 END) AS faltas,
            COUNT(*) AS total_sesiones,
            ROUND(
                (SUM(CASE WHEN a.presente = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) * 100
            , 2) AS porcentaje_asistencia
        FROM asistencias a
        JOIN matriculas m ON m.id_matricula = a.id_matricula
        JOIN cursos c     ON c.id_curso = m.id_curso
        WHERE m.id_estudiante = :est
          AND m.id_periodo    = :per
        GROUP BY c.id_curso, c.nombre
        ORDER BY c.nombre ASC
    """)
    res = await db.execute(q, {"est": id_estudiante, "per": id_periodo})
    rows = res.mappings().all()

    if not rows:
        raise HTTPException(status_code=404, detail="No se encontraron registros de asistencia")

    return {"ok": True, "data": [dict(r) for r in rows]}


# ============================================================
# CALIFICACIONES — notas finales y promedio
# ============================================================
@router.get(
    "/{id_estudiante}/calificaciones",
    response_model=ApiResponse,
    dependencies=[Depends(require_roles("admin", "autoridad", "tutor"))],
)
async def calificaciones_estudiante(
    id_estudiante: int,
    id_periodo: int = Query(..., ge=1, description="ID del periodo académico"),
    db: AsyncSession = Depends(get_session),
):
    """
    Devuelve las calificaciones del estudiante en cada curso del periodo.
    Usa calificaciones.id_matricula -> matriculas -> cursos. Calcula promedio general.
    """
    q = text("""
        SELECT
            c.nombre AS curso,
            c.creditos,
            cal.nota_final,
            CASE
                WHEN cal.nota_final >= 11 THEN 'Aprobado'
                WHEN cal.nota_final IS NULL THEN 'Pendiente'
                ELSE 'Desaprobado'
            END AS estado
        FROM calificaciones cal
        JOIN matriculas m ON m.id_matricula = cal.id_matricula
        JOIN cursos c ON c.id_curso = m.id_curso
        WHERE m.id_estudiante = :est AND m.id_periodo = :per
        ORDER BY c.nombre ASC
    """)
    res = await db.execute(q, {"est": id_estudiante, "per": id_periodo})
    rows = res.mappings().all()

    if not rows:
        raise HTTPException(
            status_code=404, detail="No se encontraron calificaciones para este periodo"
        )

    notas_validas = [r["nota_final"] for r in rows if r["nota_final"] is not None]
    promedio = round(sum(notas_validas) / len(notas_validas), 2) if notas_validas else None

    return {
        "ok": True,
        "data": {
            "detalle": [dict(r) for r in rows],
            "promedio_general": promedio,
        },
    }
