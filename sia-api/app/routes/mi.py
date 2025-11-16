# app/routers/mi.py
from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import require_roles
from ..schemas import ApiResponse

router = APIRouter(prefix="/mi", tags=["mi_panel"])

SQL_ESTUDIANTE_DESDE_USUARIO = text(
    """
    SELECT
        e.id_estudiante,
        e.codigo_alumno,
        e.id_programa,
        prog.nombre AS programa,
        p.dni,
        p.apellido_paterno,
        p.apellido_materno,
        p.nombres
    from personas p 
    join usuarios u on u.id_persona = p.id_persona 
    join estudiantes e on e.id_persona = p.id_persona 
    left join programas prog on prog.id_programa = e.id_programa
    WHERE u.id_usuario = :uid
    LIMIT 1
    """
)

SQL_RIESGO_RECIENTE = text(
    """
    SELECT
        pr.id_periodo,
        pa.nombre AS periodo,
        pr.puntaje,
        pr.creado_en AS actualizado_en,
        nr.id_nivel_riesgo AS nivel,
        nr.nombre
    FROM puntajes_riesgo pr
    JOIN niveles_riesgo nr ON nr.id_nivel_riesgo = pr.id_nivel_riesgo
    LEFT JOIN periodos_academicos pa ON pa.id_periodo = pr.id_periodo
    WHERE pr.id_estudiante = :est
    ORDER BY pr.creado_en DESC
    LIMIT 1
    """
)

SQL_PERIODOS_DISPONIBLES = text(
    """
    SELECT DISTINCT
        pa.id_periodo,
        pa.nombre
    FROM matriculas m
    JOIN periodos_academicos pa ON pa.id_periodo = m.id_periodo
    WHERE m.id_estudiante = :est
    ORDER BY pa.id_periodo DESC
    LIMIT :limit
    """
)

SQL_CALIFICACIONES = text(
    """
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
    LIMIT :limit
    """
)


def _as_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


async def _student_from_user(db: AsyncSession, user_id: int) -> Dict[str, Any]:
    row = (await db.execute(SQL_ESTUDIANTE_DESDE_USUARIO, {"uid": user_id})).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="No se encontró un estudiante asociado a su cuenta")
    return {
        "id_estudiante": int(row["id_estudiante"]),
        "codigo_alumno": row["codigo_alumno"],
        "id_programa": row["id_programa"],
        "programa": row["programa"],
        "dni": row["dni"],
        "apellido_paterno": row["apellido_paterno"],
        "apellido_materno": row["apellido_materno"],
        "nombres": row["nombres"],
    }


@router.get("/resumen", response_model=ApiResponse)
async def mi_resumen(
    limite_periodos: int = Query(
        1,
        ge=1,
        le=50,
        description="Cantidad máxima de periodos a retornar en el selector del estudiante",
    ),
    user=Depends(require_roles("estudiante")),
    db: AsyncSession = Depends(get_session),
):
    estudiante = await _student_from_user(db, int(user["id_usuario"]))
    riesgo_row = (await db.execute(SQL_RIESGO_RECIENTE, {"est": estudiante["id_estudiante"]})).mappings().first()
    riesgo_actual = None
    if riesgo_row:
        riesgo_actual = {
            "id_periodo": int(riesgo_row["id_periodo"]) if riesgo_row["id_periodo"] is not None else None,
            "periodo": riesgo_row["periodo"],
            "puntaje": _as_float(riesgo_row["puntaje"]),
            "nivel": riesgo_row["nivel"],
            # "descripcion": riesgo_row["descripcion"],
            "actualizado_en": riesgo_row["actualizado_en"],
        }

    period_rows = (
        await db.execute(
            SQL_PERIODOS_DISPONIBLES,
            {"est": estudiante["id_estudiante"], "limit": limite_periodos},
        )
    ).mappings().all()
    periodos = [
        {"id_periodo": int(row["id_periodo"]), "nombre": row["nombre"]}
        for row in period_rows
        if row.get("id_periodo") is not None
    ]

    sugerido = riesgo_actual.get("id_periodo") if riesgo_actual else None
    if sugerido is None and periodos:
        sugerido = periodos[0]["id_periodo"]

    return {
        "ok": True,
        "data": {
            "estudiante": estudiante,
            "riesgo_actual": riesgo_actual,
            "periodos_disponibles": periodos,
            "periodo_sugerido": sugerido,
        },
    }


@router.get("/calificaciones", response_model=ApiResponse)
async def mis_calificaciones(
    id_periodo: int = Query(..., ge=1, description="ID del periodo académico"),
    limite: int = Query(
        25,
        ge=5,
        le=100,
        description="Total máximo de cursos a devolver para el periodo seleccionado",
    ),
    user=Depends(require_roles("estudiante")),
    db: AsyncSession = Depends(get_session),
):
    estudiante = await _student_from_user(db, int(user["id_usuario"]))
    rows = (
        await db.execute(
            SQL_CALIFICACIONES,
            {"est": estudiante["id_estudiante"], "per": id_periodo, "limit": limite},
        )
    ).mappings().all()

    detalle = [
        {
            "curso": row["curso"],
            "creditos": int(row["creditos"]) if row.get("creditos") is not None else None,
            "nota_final": _as_float(row["nota_final"]),
            "estado": row["estado"],
        }
        for row in rows
    ]
    notas_validas = [nota for nota in (item["nota_final"] for item in detalle) if nota is not None]
    promedio = round(sum(notas_validas) / len(notas_validas), 2) if notas_validas else None

    resumen = {"aprobados": 0, "desaprobados": 0, "pendientes": 0}
    for item in detalle:
        estado = (item["estado"] or "").lower()
        if "desaprob" in estado:
            resumen["desaprobados"] += 1
        elif "pend" in estado:
            resumen["pendientes"] += 1
        elif "aprob" in estado:
            resumen["aprobados"] += 1
        else:
            resumen["desaprobados"] += 1

    return {
        "ok": True,
        "data": {
            "detalle": detalle,
            "promedio_general": promedio,
            "resumen": resumen,
        },
    }
