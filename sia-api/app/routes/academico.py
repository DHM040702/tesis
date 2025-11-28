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
            apc.id_periodo,
            apc.asistencia_pct AS porcentaje_asistencia
        FROM
            asistencias_periodo_curso apc
        JOIN
            cursos c ON c.id_curso = apc.id_curso
        WHERE apc.id_estudiante = :est
            AND apc.id_periodo    = :per
        GROUP BY c.id_curso, c.nombre
        ORDER BY c.nombre ASC;
    """)
    res = await db.execute(q, {"est": id_estudiante, "per": id_periodo})
    rows = res.mappings().all()

    if not rows:
        raise HTTPException(status_code=404, detail="No se encontraron registros de asistencia")

    return {"ok": True, "data": [dict(r) for r in rows]}


# ============================================================
# CALIFICACIONES — notas finales y promedio
# ============================================================
@router.get("/academico/{id_estudiante}/calificaciones")
async def calificaciones_estudiante(
    id_estudiante: int,
    id_periodo: int,
    db: AsyncSession = Depends(get_session),
):
    query = text("""
        SELECT
            c.nombre        AS curso,
            c.creditos      AS creditos,
            cal.nota_final  AS nota_final
        FROM calificaciones cal
        JOIN matriculas m ON m.id_matricula = cal.id_matricula
        JOIN cursos c     ON c.id_curso = m.id_curso
        WHERE m.id_estudiante = :id_estudiante
          AND m.id_periodo    = :id_periodo
    """)

    # 🔹 AQUÍ EL CAMBIO IMPORTANTE
    result = await db.execute(
        query,
        {"id_estudiante": id_estudiante, "id_periodo": id_periodo},
    )
    rows = result.mappings().all()

    detalle = [
        {
            "curso": r["curso"],
            "creditos": r["creditos"],
            "nota_final": r["nota_final"],
        }
        for r in rows
    ]

    notas_validas = [
        r for r in rows
        if r["nota_final"] is not None and r["creditos"] is not None
    ]

    if notas_validas:
        suma_ponderada = sum(
            float(r["nota_final"]) * float(r["creditos"])
            for r in notas_validas
        )
        suma_creditos = sum(float(r["creditos"]) for r in notas_validas)
        promedio = round(suma_ponderada / suma_creditos, 2) if suma_creditos > 0 else None
    else:
        promedio = None

    return {
        "detalle": detalle,
        "promedio_general": promedio,
    }

