# app/routers/tutorias.py
from __future__ import annotations
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import get_current_user
from ..schemas import ApiResponse

router = APIRouter(prefix="/tutorias", tags=["tutorias"])


# =========================
# Esquemas Pydantic
# =========================
class TutoriaIn(BaseModel):
    id_estudiante: int = Field(..., ge=1)
    id_periodo: int = Field(..., ge=1)
    fecha_hora: Optional[datetime] = None
    id_modalidad: int = Field(..., ge=1)
    tema: str = Field(..., min_length=3, max_length=150)
    observaciones: Optional[str] = Field(None, max_length=300)
    seguimiento: Optional[str] = Field(None, max_length=300)
    id_tutor_override: Optional[int] = None


class AsignarTutorIn(BaseModel):
    id_estudiante: int = Field(..., ge=1)
    id_periodo: int = Field(..., ge=1)
    id_tutor: int = Field(..., ge=1)


# =========================
# Helpers de autorización
# =========================
ADMINLIKE = {"admin", "autoridad"}
TUTORLIKE = {"tutor"}
DOCENTE = "docente"


async def _get_tutor_id_tabla(db: AsyncSession, id_usuario: int, create_if_missing: bool = False) -> Optional[int]:
    """
    Devuelve el id_tutor (tutores.id_tutor) asociado al usuario.
    Si el usuario no está registrado como tutor en la tabla 'tutores', retorna None.
    """
    row = (await db.execute(
        text("SELECT t.id_tutor FROM tutores t WHERE t.id_usuario = :u LIMIT 1"),
        {"u": id_usuario}
    )).fetchone()
    if row:
        return int(row[0])

    if not create_if_missing:
        return None

    try:
        await db.execute(text("INSERT INTO tutores (id_usuario) VALUES (:u)"), {"u": id_usuario})
        await db.commit()
    except Exception:
        await db.rollback()

    row = (await db.execute(
        text("SELECT t.id_tutor FROM tutores t WHERE t.id_usuario = :u LIMIT 1"),
        {"u": id_usuario}
    )).fetchone()
    return int(row[0]) if row else None


async def _get_tutor_from_assignment(db: AsyncSession, id_estudiante: int, id_periodo: int) -> Optional[int]:
    row = (await db.execute(
        text("""
            SELECT a.id_tutor
            FROM asignaciones_tutoria a
            WHERE a.id_estudiante = :est AND a.id_periodo = :per
            ORDER BY a.id_asignacion DESC
            LIMIT 1
        """),
        {"est": id_estudiante, "per": id_periodo}
    )).fetchone()
    return int(row[0]) if row else None


async def _autoriza_gestion_tutorias(db: AsyncSession, user: dict) -> dict:
    """
    Reglas de acceso:
      - admin / autoridad: acceso total.
      - tutor (rol) o docente (rol) SOLO si aparece en 'tutores': acceso restringido a sus tutorías/asignaciones.
      - otros: 403.

    Retorna:
      {
        "is_adminlike": bool,
        "id_tutor_tabla": Optional[int],  # tutores.id_tutor si aplica
        "id_usuario": int
      }
    """
    roles = {
        str(role).strip().lower()
        for role in (user.get("roles") or [])
        if role is not None
    }
    id_usuario = int(user["id_usuario"])

    # Admin o autoridad → acceso total
    if roles & ADMINLIKE:
        return {"is_adminlike": True, "id_tutor_tabla": None, "id_usuario": id_usuario}

    # Tutor o docente → debe existir en 'tutores'
    if (roles & TUTORLIKE) or (DOCENTE in roles):
        id_tutor_tabla = await _get_tutor_id_tabla(db, id_usuario, create_if_missing=True)
        if id_tutor_tabla:
            return {"is_adminlike": False, "id_tutor_tabla": id_tutor_tabla, "id_usuario": id_usuario}
        # Tiene rol tutor/docente pero no registro en 'tutores' → sin permiso
        raise HTTPException(status_code=403, detail="Permisos insuficientes para acceder a este recurso")

    # Otros roles → no permitido
    raise HTTPException(status_code=403, detail="Permisos insuficientes para acceder a este recurso")


# =========================
# 1) Mis estudiantes asignados (por tutor y periodo)
# =========================
@router.get(
    "/tutores/mis-estudiantes",
    response_model=ApiResponse
)
async def mis_estudiantes(
    id_periodo: Optional[int] = Query(None, ge=1),
    db: AsyncSession = Depends(get_session),
    user=Depends(get_current_user),
):
    """
    Devuelve la lista de estudiantes asignados al tutor logueado (tabla 'asignaciones_tutoria').
    - Si es admin/autoridad: puede ver todos los asignados (opcionalmente filtrando por periodo).
    - Si es tutor/docente: sólo sus asignaciones (requiere estar en 'tutores').
    """
    auth = await _autoriza_gestion_tutorias(db, user)

    base_sql = """
        SELECT 
            e.id_estudiante,
            p.dni,
            CONCAT_WS(' ', p.apellido_paterno, p.apellido_materno, ',', p.nombres) AS estudiante,
            prog.nombre AS programa,
            pa.nombre   AS periodo,
            a.id_tutor,
            CONCAT_WS(' ', pt.apellido_paterno, pt.apellido_materno, ',', pt.nombres) AS tutor,
            pt.dni AS tutor_dni,
            ut.correo AS tutor_correo
        FROM asignaciones_tutoria a
        JOIN estudiantes e        ON e.id_estudiante = a.id_estudiante
        LEFT JOIN personas p      ON p.id_persona = e.id_persona
        LEFT JOIN programas prog  ON prog.id_programa = e.id_programa
        LEFT JOIN periodos_academicos pa ON pa.id_periodo = a.id_periodo
        JOIN tutores tt           ON tt.id_tutor = a.id_tutor
        JOIN usuarios ut          ON ut.id_usuario = tt.id_usuario
        LEFT JOIN personas pt     ON pt.id_persona = ut.id_persona
        WHERE 1=1
    """

    params = {}
    where_extra = ""

    if id_periodo:
        where_extra += " AND a.id_periodo = :per"
        params["per"] = id_periodo

    if auth["is_adminlike"]:
        sql = base_sql + where_extra + " ORDER BY p.apellido_paterno, p.apellido_materno, p.nombres"
    else:
        # Filtrar por su id_tutor (tutores.id_tutor)
        sql = base_sql + " AND a.id_tutor = :tutor" + where_extra + " ORDER BY p.apellido_paterno, p.apellido_materno, p.nombres"
        params["tutor"] = auth["id_tutor_tabla"]

    res = await db.execute(text(sql), params)
    data = [dict(r._mapping) for r in res.fetchall()]
    return {"ok": True, "data": data}


# =========================
# 1.b) Catálogo y asignación de tutores (solo admin/autoridad)
# =========================
@router.get(
    "/tutores/catalogo",
    response_model=ApiResponse
)
async def catalogo_tutores(
    termino: Optional[str] = Query(None, min_length=2),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_session),
    user=Depends(get_current_user),
):
    auth = await _autoriza_gestion_tutorias(db, user)
    if not auth["is_adminlike"]:
        raise HTTPException(status_code=403, detail="Solo admin o autoridad pueden consultar tutores.")

    base_sql = """
        SELECT 
            t.id_tutor,
            u.id_usuario,
            pt.dni,
            CONCAT_WS(' ', pt.apellido_paterno, pt.apellido_materno, ',', pt.nombres) AS nombre,
            u.correo
        FROM tutores t
        JOIN usuarios u      ON u.id_usuario = t.id_usuario
        LEFT JOIN personas pt ON pt.id_persona = u.id_persona
        WHERE 1=1
    """
    where_extra = ""
    params = {"limit": limit}
    if termino:
        where_extra += " AND (pt.dni LIKE :term OR CONCAT_WS(' ', pt.apellido_paterno, pt.apellido_materno, pt.nombres) LIKE :term)"
        params["term"] = f"%{termino.strip()}%"

    sql = base_sql + where_extra + " ORDER BY pt.apellido_paterno, pt.apellido_materno, pt.nombres LIMIT :limit"
    res = await db.execute(text(sql), params)
    data = [dict(r._mapping) for r in res.fetchall()]
    return {"ok": True, "data": data}


@router.post(
    "/tutores/asignar",
    response_model=ApiResponse
)
async def asignar_tutor(
    payload: AsignarTutorIn,
    db: AsyncSession = Depends(get_session),
    user=Depends(get_current_user),
):
    auth = await _autoriza_gestion_tutorias(db, user)
    if not auth["is_adminlike"]:
        raise HTTPException(status_code=403, detail="Solo admin o autoridad pueden asignar tutores.")

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

    chk_tutor = (await db.execute(
        text("SELECT 1 FROM tutores WHERE id_tutor=:id LIMIT 1"),
        {"id": payload.id_tutor}
    )).fetchone()
    if not chk_tutor:
        raise HTTPException(status_code=404, detail="Tutor no encontrado")

    existing = (await db.execute(text("""
        SELECT id_asignacion, id_tutor
        FROM asignaciones_tutoria
        WHERE id_estudiante=:est AND id_periodo=:per
        ORDER BY id_asignacion DESC
        LIMIT 1
    """), {"est": payload.id_estudiante, "per": payload.id_periodo})).fetchone()

    try:
        if existing and int(existing.id_tutor) == payload.id_tutor:
            message = "El estudiante ya está asignado a este tutor."
        elif existing:
            await db.execute(
                text("UPDATE asignaciones_tutoria SET id_tutor=:tutor WHERE id_asignacion=:id"),
                {"tutor": payload.id_tutor, "id": int(existing.id_asignacion)}
            )
            await db.commit()
            message = "Asignación actualizada."
        else:
            await db.execute(
                text("INSERT INTO asignaciones_tutoria (id_tutor, id_estudiante, id_periodo) VALUES (:tutor, :est, :per)"),
                {"tutor": payload.id_tutor, "est": payload.id_estudiante, "per": payload.id_periodo}
            )
            await db.commit()
            message = "Asignación registrada."
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"No se pudo registrar la asignación: {exc}")

    return {"ok": True, "message": message}


# =========================
# 2) Listar tutorías (histórico)
# =========================
@router.get(
    "/",
    response_model=ApiResponse
)
async def listar_tutorias(
    id_estudiante: Optional[int] = Query(None, ge=1),
    id_periodo: Optional[int] = Query(None, ge=1),
    db: AsyncSession = Depends(get_session),
    user=Depends(get_current_user)
):
    """
    Lista sesiones de tutoría registradas (tabla 'tutorias').
    - Admin/autoridad: ve todas, con filtros opcionales.
    - Tutor/docente: ve solo sus sesiones (id_tutor propio en 'tutorias'), con filtros opcionales.
    Campos esperados en 'tutorias': id_tutoria, id_tutor (FK a tutores.id_tutor), id_estudiante, id_periodo, fecha, tema, observaciones, seguimiento.
    """
    auth = await _autoriza_gestion_tutorias(db, user)

    base_sql = """
        SELECT 
            t.id_tutoria,
            t.id_estudiante,
            p.dni,
            CONCAT_WS(' ', p.apellido_paterno, p.apellido_materno, ',', p.nombres) AS estudiante,
            pa.nombre      AS periodo,
            t.fecha_hora,
            t.tema,
            t.observaciones,
            t.seguimiento,
            CONCAT_WS(' ', pt.apellido_paterno, pt.apellido_materno, ',', pt.nombres) AS tutor
        FROM tutorias t
        JOIN estudiantes e  ON e.id_estudiante = t.id_estudiante
        LEFT JOIN personas p ON p.id_persona   = e.id_persona
        JOIN periodos_academicos pa ON pa.id_periodo = t.id_periodo
        JOIN tutores tt ON tt.id_tutor = t.id_tutor
        JOIN usuarios ut ON ut.id_usuario = tt.id_usuario
        JOIN personas pt ON pt.id_persona = ut.id_persona
        WHERE 1=1
    """

    params = {}
    where_extra = ""

    if id_estudiante:
        where_extra += " AND t.id_estudiante = :est"
        params["est"] = id_estudiante

    if id_periodo:
        where_extra += " AND t.id_periodo = :per"
        params["per"] = id_periodo

    if auth["is_adminlike"]:
        sql = base_sql + where_extra + " ORDER BY t.fecha_hora DESC, t.id_tutoria DESC"
    else:
        # Restringir a las tutorías del propio tutor
        sql = base_sql + " AND t.id_tutor = :tutor" + where_extra + " ORDER BY t.fecha_hora DESC, t.id_tutoria DESC"
        params["tutor"] = auth["id_tutor_tabla"]

    res = await db.execute(text(sql), params)   
    data = [dict(r._mapping) for r in res.fetchall()]
    return {"ok": True, "data": data}


# =========================
# 3) Registrar tutoría
# =========================
@router.post("/", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def registrar_tutoria(
    payload: TutoriaIn,
    db: AsyncSession = Depends(get_session),
    user = Depends(get_current_user)
):
    auth = await _autoriza_gestion_tutorias(db, user)  # is_adminlike, id_tutor_tabla

    # Validaciones básicas
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

    # Determinar id_tutor que se grabará
    if auth["is_adminlike"]:
        if payload.id_tutor_override is not None:
            id_tutor_final = payload.id_tutor_override
        else:
            # buscar primero al tutor asignado al estudiante en el periodo
            id_tutor_final = await _get_tutor_from_assignment(db, payload.id_estudiante, payload.id_periodo)
            if id_tutor_final is None:
                # como última opción, intenta mapear al propio admin si también es tutor
                id_tutor_final = await _get_tutor_id_tabla(db, auth["id_usuario"])
        if id_tutor_final is None:
            raise HTTPException(
                status_code=400,
                detail="No se pudo determinar el tutor responsable. Envía 'id_tutor_override' o crea la asignación tutor-estudiante."
            )
        # adminlike no obliga a validar asignación tutor-estudiante-periodo (depende de tu política)
    else:
        # debe ser tutor: usar su id_tutor y validar asignación
        id_tutor_final = auth["id_tutor_tabla"]
        id_tutor_asignado = await _get_tutor_from_assignment(db, payload.id_estudiante, payload.id_periodo)
        if id_tutor_asignado != id_tutor_final:
            raise HTTPException(
                status_code=403,
                detail="El estudiante no está asignado a este tutor en el periodo indicado"
            )
            
        # 411
        # try:
        #     if payload.fecha_hora is None:␍␊
        #         # sin fecha_hora -> usa DEFAULT de la BD
        #         await db.execute(text("""␍␊
        #             INSERT INTO tutorias␍␊
        #                 (id_tutor, id_estudiante, id_periodo, fecha_hora, id_modalidad_tutoria, tema, observaciones, seguimiento)
        #             VALUES␍␊
        #                 (:tutor, :est, :per, curdate(),:mod , :tem, :obs, :seg)
        #         """), {␍␊
        #             "tutor": id_tutor_final,␍␊
        #             "est": payload.id_estudiante,␍␊
        #             "per": payload.id_periodo,␍␊
        #             "mod": payload.id_modalidad,␍␊
        #             "tem": payload.tema,␍␊
        #             "obs": payload.observaciones,␍␊
        #             "seg": payload.seguimiento␍␊
        #         })␍␊
        #     else:␍␊
        #         # con fecha_hora proporcionada␍␊
        #         await db.execute(text("""␍␊
        #             INSERT INTO tutorias␍␊
        #                 (id_tutor, id_estudiante, id_periodo, fecha_hora,id_modalidad_tutoria, tema, observaciones, seguimiento)
        #             VALUES␍␊
        #                 (:tutor, :est, :per, :fec,:mod, :tem, :obs, :seg)
        #         """), {␍␊
        #             "tutor": id_tutor_final,␍␊
        #             "est": payload.id_estudiante,␍␊
        #             "per": payload.id_periodo,␍␊
        #             "mod": payload.id_modalidad,␍␊
        #             "fec": payload.fecha_hora,␍␊
        #             "tem": payload.tema,␍␊
        #             "obs": payload.observaciones,␍␊
        #             "seg": payload.seguimiento␍␊
        #         })
        # 444

    # Construir INSERT (dejando que la BD ponga fecha_hora por defecto si no se envía)
    try:
        if payload.fecha_hora is None:
            # sin fecha_hora -> deja que la columna utilice CURRENT_TIMESTAMP
            await db.execute(text("""
                INSERT INTO tutorias
                    (id_tutor, id_estudiante, id_periodo, id_modalidad_tutoria, tema, observaciones, seguimiento)
                VALUES
                    (:tutor, :est, :per, :mod, :tem, :obs, :seg)
            """), {
                "tutor": id_tutor_final,
                "est": payload.id_estudiante,
                "per": payload.id_periodo,
                "mod": payload.id_modalidad,
                "tem": payload.tema,
                "obs": payload.observaciones,
                "seg": payload.seguimiento
            })
        else:
            # con fecha_hora proporcionada
            await db.execute(text("""
                INSERT INTO tutorias
                    (id_tutor, id_estudiante, id_periodo, fecha_hora, id_modalidad_tutoria, tema, observaciones, seguimiento)
                VALUES
                    (:tutor, :est, :per, :fec, :mod, :tem, :obs, :seg)
            """), {
                "tutor": id_tutor_final,
                "est": payload.id_estudiante,
                "per": payload.id_periodo,
                "mod": payload.id_modalidad,
                "fec": payload.fecha_hora,
                "tem": payload.tema,
                "obs": payload.observaciones,
                "seg": payload.seguimiento
            })
        await db.commit()
    except Exception as ex:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"No se pudo registrar la tutoría: {ex}")

    # Devolver la última insertada (requiere PK autoincremental id_tutoria)
    row = (await db.execute(text("""
        SELECT 
            t.id_tutoria,
            t.id_estudiante,
            t.id_periodo,
            t.fecha_hora,
            t.tema,
            t.observaciones,
            t.seguimiento
        FROM tutorias t
        WHERE t.id_estudiante=:est AND t.id_periodo=:per
        ORDER BY t.id_tutoria DESC
        LIMIT 1
    """), {"est": payload.id_estudiante, "per": payload.id_periodo})).fetchone()

    return {"ok": True, "message": "Tutoría registrada", "data": dict(row._mapping) if row else None}
