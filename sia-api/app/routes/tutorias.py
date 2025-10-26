# app/routers/tutorias.py
from __future__ import annotations
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from ..db import get_session
from ..deps import get_current_user
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
# Helpers de autorización
# =========================

ADMINLIKE = {"admin", "autoridad"}
TUTORLIKE = {"tutor"}  # rol explícito de tutor
DOCENTE = "docente"


async def _get_tutor_id_por_usuario(db: AsyncSession, id_usuario: int) -> Optional[int]:
    """Devuelve id_tutor si el usuario está registrado como tutor; None en caso contrario."""
    row = (await db.execute(
        text("SELECT t.id_tutor FROM tutores t WHERE t.id_usuario = :u LIMIT 1"),
        {"u": id_usuario}
    )).fetchone()
    return int(row[0]) if row else None


async def _autoriza_gestion_tutorias(db: AsyncSession, user: dict) -> dict:
    """
    Regla de acceso:
      - admin/autoridad: permitido
      - rol 'tutor': permitido
      - rol 'docente' y existe registro en 'tutores' -> permitido
      - caso contrario: 403
    Retorna dict con:
      - is_adminlike: bool
      - id_tutor: Optional[int] (None si no aplica)
    """
    roles = set(user.get("roles") or [])
    id_usuario = int(user["id_usuario"])

    # Admin o autoridad -> acceso total
    if roles & ADMINLIKE:
        return {"is_adminlike": True, "id_tutor": None}

    # Tutor explícito por rol
    if roles & TUTORLIKE:
        id_tutor = await _get_tutor_id_por_usuario(db, id_usuario)
        if id_tutor:
            return {"is_adminlike": False, "id_tutor": id_tutor}
        # Si tiene rol tutor pero aún no está en tabla tutores, lo tratamos como no autorizado
        # (evita inconsistencias)
        raise HTTPException(status_code=403, detail="El usuario tiene rol 'tutor' pero no está registrado en 'tutores'.")

    # Docente que también está en tutores
    if DOCENTE in roles:
        id_tutor = await _get_tutor_id_por_usuario(db, id_usuario)
        if id_tutor:
            return {"is_adminlike": False, "id_tutor": id_tutor}

    # Caso contrario: prohibido
    raise HTTPException(status_code=403, detail="Permisos insuficientes para acceder a este recurso")


# =========================
# 1️⃣ Mis estudiantes asignados
# =========================

@router.get("/tutores/mis-estudiantes", response_model=ApiResponse)
async def mis_estudiantes(
    db: AsyncSession = Depends(get_session),
    user=Depends(get_current_user),
):
    """
    Devuelve la lista de estudiantes asignados al tutor logueado.
    Usa 'asignaciones_tutoria(id_tutor, id_estudiante, id_periodo)'.
    - Admin/autoridad: devuelve TODAS las asignaciones
    - Tutor/Docente en tabla 'tutores': devuelve solo sus asignaciones
    """
    auth = await _autoriza_gestion_tutorias(db, user)

    base_sql = """
        SELECT 
            e.id_estudiante,
            p.dni,
            CONCAT_WS(' ', p.apellido_paterno, p.apellido_materno, ',', p.nombres) AS estudiante,
            prog.nombre AS programa,
            pa.nombre AS periodo
        FROM asignaciones_tutoria a
        JOIN estudiantes e      ON e.id_estudiante = a.id_estudiante
        LEFT JOIN personas p    ON p.id_persona    = e.id_persona
        LEFT JOIN programas prog ON prog.id_programa = e.id_programa
        LEFT JOIN periodos_academicos pa ON pa.id_periodo = a.id_periodo
    """

    params = {}
    if auth["is_adminlike"]:
        sql = base_sql + " ORDER BY p.apellido_paterno, p.apellido_materno, p.nombres"
    else:
        sql = base_sql + " WHERE a.id_tutor = :tutor ORDER BY p.apellido_paterno, p.apellido_materno, p.nombres"
        params["tutor"] = auth["id_tutor"]

    res = await db.execute(text(sql), params)
    data = [dict(r._mapping) for r in res.fetchall()]
    return {"ok": True, "data": data}


# =========================
# 2️⃣ Listar tutorías
# =========================

@router.get("/", response_model=ApiResponse)
async def listar_tutorias(
    id_estudiante: Optional[int] = Query(None),
    id_periodo: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_session),
    user=Depends(get_current_user),
):
    """
    Lista las sesiones de tutoría registradas.
    - Admin/autoridad: puede ver todas
    - Tutor/Docente en 'tutores': solo sus propias tutorías (id_tutor)
    Filtros opcionales: id_estudiante, id_periodo
    """
    auth = await _autoriza_gestion_tutorias(db, user)

    base_sql = """
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
        JOIN estudiantes e  ON e.id_estudiante = t.id_estudiante
        LEFT JOIN personas p ON p.id_persona  = e.id_persona
        LEFT JOIN usuarios u ON u.id_usuario  = t.id_tutor
        LEFT JOIN personas pt ON pt.id_persona = u.id_persona
        LEFT JOIN periodos_academicos pa ON pa.id_periodo = t.id_periodo
        WHERE 1=1
    """

    params = {}
    where_extra = []

    if id_estudiante is not None:
        where_extra.append(" AND t.id_estudiante = :est")
        params["est"] = id_estudiante
    if id_periodo is not None:
        where_extra.append(" AND t.id_periodo = :per")
        params["per"] = id_periodo

    if auth["is_adminlike"]:
        sql = base_sql + "".join(where_extra) + " ORDER BY t.fecha DESC"
    else:
        # Sólo las tutorías de este tutor
        sql = base_sql + " AND t.id_tutor = :tutor" + "".join(where_extra) + " ORDER BY t.fecha DESC"
        params["tutor"] = auth["id_tutor"]

    res = await db.execute(text(sql), params)
    data = [dict(r._mapping) for r in res.fetchall()]
    return {"ok": True, "data": data}


# =========================
# 3️⃣ Registrar tutoría
# =========================

@router.post("/", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def registrar_tutoria(
    payload: TutoriaIn,
    db: AsyncSession = Depends(get_session),
    user=Depends(get_current_user)
):
    """
    Registra una nueva sesión de tutoría entre el tutor logueado y un estudiante.
    Reglas:
      - admin/autoridad: puede registrar para cualquier estudiante
      - tutor/docente (en 'tutores'): sólo si existe asignación en 'asignaciones_tutoria'
    """
    auth = await _autoriza_gestion_tutorias(db, user)

    # Validaciones básicas de existencia
    chk_est = (await db.execute(
        text("SELECT 1 FROM estudiantes WHERE id_estudiante=:id LIMIT 1"),
        {"id": payload.id_estudiante}
    )).fetchone()
    if not chk_est:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    chk_per = (await db.execute(
        text("SELECT 1 FROM periodos_academicos WHERE id_periodo=:id LIMIT 1"),
        {"id": payload.id_periodo}
    )).fetchone()
    if not chk_per:
        raise HTTPException(status_code=404, detail="Periodo no encontrado")

    # Si no es admin/autoridad, exige asignación de tutoría
    if not auth["is_adminlike"]:
        asig = (await db.execute(
            text("""
                SELECT 1 
                FROM asignaciones_tutoria 
                WHERE id_tutor=:tutor AND id_estudiante=:est AND id_periodo=:per
                LIMIT 1
            """),
            {"tutor": auth["id_tutor"], "est": payload.id_estudiante, "per": payload.id_periodo}
        )).fetchone()
        if not asig:
            raise HTTPException(
                status_code=403,
                detail="El estudiante no está asignado a este tutor en el periodo indicado"
            )

    # Insertar la tutoría: t.id_tutor debe ser el id_usuario (según tu modelo actual)
    # Si tu tabla `tutorias.id_tutor` referencia 'tutores.id_tutor', cambia el valor que guardas aquí.
    id_tutor_para_insert = user["id_usuario"] if auth["is_adminlike"] else user["id_usuario"]

    try:
        await db.execute(text("""
            INSERT INTO tutorias (id_tutor, id_estudiante, id_periodo, fecha, tema, observaciones, seguimiento)
            VALUES (:tutor, :est, :per, :fec, :tem, :obs, :seg)
        """), {
            "tutor": id_tutor_para_insert,
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

    # Retornar la última tutoría insertada por este usuario a este estudiante
    row = (await db.execute(text("""
        SELECT 
            t.id_tutoria, t.id_estudiante, t.fecha, t.tema, t.observaciones, t.seguimiento
        FROM tutorias t
        WHERE t.id_tutor=:tutor AND t.id_estudiante=:est
        ORDER BY t.id_tutoria DESC
        LIMIT 1
    """), {"tutor": id_tutor_para_insert, "est": payload.id_estudiante})).fetchone()

    return {"ok": True, "message": "Tutoría registrada", "data": dict(row._mapping)}
