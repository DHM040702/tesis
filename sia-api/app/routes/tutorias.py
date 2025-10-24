# app/routers/tutorias.py
from __future__ import annotations
from datetime import date, datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from ..db import get_session
from ..deps import get_current_user, require_roles
from ..schemas import ApiResponse

router = APIRouter(prefix="/tutorias", tags=["tutorias"])


# =========================
# Esquemas Pydantic
# =========================

class TutoriaIn(BaseModel):
    id_estudiante: int
    id_periodo: int
    fecha: date = Field(default_factory=date.today)
    tema: str = Field(..., min_length=3, max_length=150)
    observaciones: Optional[str] = Field(None, max_length=300)
    seguimiento: Optional[str] = Field(None, max_length=300)


# =========================
# 1️⃣ Mis estudiantes asignados
# =========================

@router.get("/tutores/mis-estudiantes", response_model=ApiResponse, dependencies=[Depends(require_roles("tutor","autoridad","admin"))])
async def mis_estudiantes(
    db: AsyncSession = Depends(get_session),
    user=Depends(get_current_user),
):
    """
    Devuelve la lista de estudiantes asignados al tutor logueado.
    Basado en la tabla 'asignaciones_tutoria' que vincula (id_tutor, id_estudiante, id_periodo).
    """
    q = text("""
        SELECT 
            e.id_estudiante,
            p.dni,
            CONCAT_WS(' ', p.apellido_paterno, p.apellido_materno, ',', p.nombres) AS estudiante,
            prog.nombre AS programa,
            pa.nombre AS periodo
        FROM asignaciones_tutoria a
        JOIN estudiantes e ON e.id_estudiante = a.id_estudiante
        LEFT JOIN personas p ON p.id_persona = e.id_persona
        LEFT JOIN programas prog ON prog.id_programa = e.id_programa
        LEFT JOIN periodos_academicos pa ON pa.id_periodo = a.id_periodo
        WHERE a.id_tutor = :tutor
        ORDER BY p.apellido_paterno, p.apellido_materno, p.nombres
    """)
    res = await db.execute(q, {"tutor": user["id_usuario"]})
    data = [dict(r._mapping) for r in res.fetchall()]
    return {"ok": True, "data": data}


# =========================
# 2️⃣ Listar tutorías
# =========================

@router.get("/", response_model=ApiResponse, dependencies=[Depends(require_roles("tutor","autoridad","admin"))])
async def listar_tutorias(
    id_estudiante: Optional[int] = Query(None),
    id_periodo: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_session)
):
    """
    Lista todas las sesiones de tutoría registradas, con filtros opcionales:
      - id_estudiante (para ver el historial de un estudiante)
      - id_periodo (para ver un ciclo específico)
    """
    sql = """
        SELECT 
            t.id_tutoria,
            t.id_estudiante,
            p.dni,
            CONCAT_WS(' ', p.apellido_paterno, p.apellido_materno, ',', p.nombres) AS estudiante,
            pa.nombre AS periodo,
            t.fecha,
            t.tema,
            t.observaciones,
            t.seguimiento,
            CONCAT_WS(' ', pt.apellido_paterno, pt.apellido_materno, ',', pt.nombres) AS tutor
        FROM tutorias t
        JOIN estudiantes e ON e.id_estudiante = t.id_estudiante
        LEFT JOIN personas p ON p.id_persona = e.id_persona
        LEFT JOIN usuarios u ON u.id_usuario = t.id_tutor
        LEFT JOIN personas pt ON pt.id_persona = u.id_persona
        LEFT JOIN periodos_academicos pa ON pa.id_periodo = t.id_periodo
        WHERE 1=1
    """
    params = {}
    if id_estudiante:
        sql += " AND t.id_estudiante=:est"
        params["est"] = id_estudiante
    if id_periodo:
        sql += " AND t.id_periodo=:per"
        params["per"] = id_periodo
    sql += " ORDER BY t.fecha DESC"

    res = await db.execute(text(sql), params)
    data = [dict(r._mapping) for r in res.fetchall()]
    return {"ok": True, "data": data}


# =========================
# 3️⃣ Registrar tutoría
# =========================

@router.post("/", response_model=ApiResponse, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_roles("tutor","autoridad","admin"))])
async def registrar_tutoria(
    payload: TutoriaIn,
    db: AsyncSession = Depends(get_session),
    user=Depends(get_current_user)
):
    """
    Registra una nueva sesión de tutoría entre el tutor logueado y un estudiante.
    - Verifica existencia del estudiante y periodo.
    - Guarda fecha, tema, observaciones y seguimiento inicial.
    """
    # Validaciones básicas
    chk_est = (await db.execute(text("SELECT 1 FROM estudiantes WHERE id_estudiante=:id LIMIT 1"),
                                {"id": payload.id_estudiante})).fetchone()
    if not chk_est:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    chk_per = (await db.execute(text("SELECT 1 FROM periodos_academicos WHERE id_periodo=:id LIMIT 1"),
                                {"id": payload.id_periodo})).fetchone()
    if not chk_per:
        raise HTTPException(status_code=404, detail="Periodo no encontrado")

    try:
        await db.execute(text("""
            INSERT INTO tutorias (id_tutor, id_estudiante, id_periodo, fecha, tema, observaciones, seguimiento)
            VALUES (:tutor, :est, :per, :fec, :tem, :obs, :seg)
        """), {
            "tutor": user["id_usuario"],
            "est": payload.id_estudiante,
            "per": payload.id_periodo,
            "fec": payload.fecha,
            "tem": payload.tema,
            "obs": payload.observaciones,
            "seg": payload.seguimiento
        })
        await db.commit()
    except Exception as ex:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"No se pudo registrar la tutoría: {ex}")

    # Retornar confirmación
    q = text("""
        SELECT t.id_tutoria, t.id_estudiante, t.fecha, t.tema, t.observaciones, t.seguimiento
        FROM tutorias t
        WHERE t.id_tutor=:tutor AND t.id_estudiante=:est
        ORDER BY t.id_tutoria DESC LIMIT 1
    """)
    row = (await db.execute(q, {"tutor": user["id_usuario"], "est": payload.id_estudiante})).fetchone()
    return {"ok": True, "message": "Tutoría registrada", "data": dict(row._mapping)}
