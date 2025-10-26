# app/routers/dev.py
"""
Router SOLO para desarrollo (DEV_MODE=true).
Permite CRUD básico de:
- personas (upsert interno por DNI)
- usuarios (siempre enlazados a personas)
- estudiantes (siempre enlazados a personas)

SIN AUTENTICACIÓN. ¡NO usar en producción!
"""

from __future__ import annotations
import os
from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, constr, conint
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..security import hash_password, password_is_strong, password_strength_hint

router = APIRouter(prefix="/dev", tags=["dev"])

# Guardrail: exige DEV_MODE=true
DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"
def ensure_dev():
    if not DEV_MODE:
        raise HTTPException(status_code=403, detail="Dev API deshabilitada")
    return True

# =========================
# Esquemas Pydantic
# =========================

class PersonaIn(BaseModel):
    dni: constr(strip_whitespace=True, min_length=8, max_length=20)
    apellido_paterno: constr(min_length=2, max_length=80)
    apellido_materno: constr(min_length=2, max_length=80)
    nombres: constr(min_length=2, max_length=120)
    id_genero: Optional[int] = None
    fecha_nacimiento: Optional[date] = None

class UsuarioCreate(BaseModel):
    correo: EmailStr
    contrasenia: str = Field(min_length=8)
    estado: str = "activo"  # 'activo' | 'bloqueado'
    roles: List[str] = []
    persona: PersonaIn

class UsuarioUpdate(BaseModel):
    correo: Optional[EmailStr] = None
    contrasenia: Optional[str] = Field(default=None, min_length=8)
    estado: Optional[str] = None
    roles: Optional[List[str]] = None
    persona: Optional[PersonaIn] = None

class EstudianteCreate(BaseModel):
    persona: PersonaIn
    id_programa: Optional[int] = None
    anio_ingreso: Optional[conint(ge=1900, le=2100)] = None
    id_estado_academico: Optional[int] = 1
    codigo_alumno: Optional[str] = None

class EstudianteUpdate(BaseModel):
    persona: Optional[PersonaIn] = None
    id_programa: Optional[int] = None
    anio_ingreso: Optional[conint(ge=1900, le=2100)] = None
    id_estado_academico: Optional[int] = None
    codigo_alumno: Optional[str] = None

class PerfilEstudianteIn(BaseModel):
    id_programa: Optional[int] = None
    anio_ingreso: Optional[conint(ge=1900, le=2100)] = None
    id_estado_academico: Optional[int] = 1
    codigo_alumno: Optional[str] = None

class PerfilDocenteIn(BaseModel):
    id_departamento: Optional[int] = None    # ajusta al nombre real si es otro
    categoria: Optional[str] = None          # opcional

class PerfilAutoridadIn(BaseModel):
    id_cargo: Optional[int] = None           # ajusta si tu tabla usa otra FK

class PerfilesIn(BaseModel):
    estudiante: Optional[PerfilEstudianteIn] = None
    docente: Optional[PerfilDocenteIn] = None
    autoridad: Optional[PerfilAutoridadIn] = None

class PersonaIn(BaseModel):
    dni: constr(strip_whitespace=True, min_length=8, max_length=20)
    apellido_paterno: constr(min_length=2, max_length=80)
    apellido_materno: constr(min_length=2, max_length=80)
    nombres: constr(min_length=2, max_length=120)
    id_genero: Optional[int] = None
    fecha_nacimiento: Optional[date] = None

class UsuarioCreate(BaseModel):
    correo: EmailStr
    contrasenia: str = Field(min_length=8)
    estado: str = "activo"  # 'activo' | 'bloqueado'
    roles: List[str] = []
    persona: PersonaIn
    perfiles: Optional[PerfilesIn] = None  # <-- NUEVO


# =========================
# Helpers
# =========================


# --- Helpers de inserción segura en tablas por rol ---
SQL_INS_ESTUDIANTE = text("""
    INSERT INTO estudiantes (id_persona, id_programa, anio_ingreso, id_estado_academico, codigo_alumno)
    VALUES (:pid, :prog, :anio, :estado, :codigo)
    ON DUPLICATE KEY UPDATE
      id_programa=VALUES(id_programa),
      anio_ingreso=VALUES(anio_ingreso),
      id_estado_academico=VALUES(id_estado_academico),
      codigo_alumno=VALUES(codigo_alumno)
""")

SQL_INS_DOCENTE = text("""
    INSERT INTO docentes (id_persona, id_departamento, categoria)
    VALUES (:pid, :dep, :cat)
    ON DUPLICATE KEY UPDATE
      id_departamento=VALUES(id_departamento),
      categoria=VALUES(categoria)
""")

SQL_INS_AUTORIDAD = text("""
    INSERT INTO autoridades (id_persona, id_cargo)
    VALUES (:pid, :cargo)
    ON DUPLICATE KEY UPDATE
      id_cargo=VALUES(id_cargo)
""")

SQL_INS_AUTORIDAD = text("""
    INSERT INTO autoridades (id_persona, id_cargo)
    VALUES (:pid, :cargo)
    ON DUPLICATE KEY UPDATE
      id_cargo=VALUES(id_cargo)
""")

# =========================
# Utilidades
# =========================

async def _estado_to_id(db: AsyncSession, estado: str) -> int:
    q = text("SELECT id_estado_usuario FROM estados_usuario WHERE nombre=:n LIMIT 1")
    r = await db.execute(q, {"n": estado})
    row = r.fetchone()
    if not row:
        raise HTTPException(400, detail=f"Estado de usuario inválido: {estado}")
    return row.id_estado_usuario

async def _ensure_roles_exist(db: AsyncSession, roles: List[str]) -> None:
    if not roles:
        return
    for rol in roles:
        await db.execute(
            text("INSERT IGNORE INTO roles (nombre, descripcion) VALUES (:n, :d)"),
            {"n": rol, "d": f"Rol {rol}"}
        )

async def _set_user_roles(db: AsyncSession, id_usuario: int, roles: List[str]) -> None:
    await db.execute(text("DELETE FROM usuarios_roles WHERE id_usuario=:u"), {"u": id_usuario})
    if not roles:
        return
    await _ensure_roles_exist(db, roles)
    names_tuple = tuple(set(roles))
    if len(names_tuple) == 1:
        where_names = "= (:name0)"
    else:
        placeholders = ", ".join([f":name{i}" for i in range(len(names_tuple))])
        where_names = f"IN ({placeholders})"
    qtxt = f"""
        INSERT INTO usuarios_roles (id_usuario, id_rol)
        SELECT :u, r.id_rol
        FROM roles r
        WHERE r.nombre {where_names}
    """
    params = {"u": id_usuario}
    for i, n in enumerate(names_tuple):
        params[f"name{i}"] = n
    await db.execute(text(qtxt), params)

async def _upsert_persona(db: AsyncSession, p: PersonaIn) -> int:
    await db.execute(text("""
        INSERT INTO personas (dni, apellido_paterno, apellido_materno, nombres, id_genero, fecha_nacimiento)
        VALUES (:dni, :ap, :am, :nom, :gen, :fnac)
        ON DUPLICATE KEY UPDATE
          apellido_paterno=VALUES(apellido_paterno),
          apellido_materno=VALUES(apellido_materno),
          nombres=VALUES(nombres),
          id_genero=VALUES(id_genero),
          fecha_nacimiento=VALUES(fecha_nacimiento)
    """), {"dni": p.dni, "ap": p.apellido_paterno, "am": p.apellido_materno,
           "nom": p.nombres, "gen": p.id_genero, "fnac": p.fecha_nacimiento})
    row = (await db.execute(text("SELECT id_persona FROM personas WHERE dni=:dni"), {"dni": p.dni})).fetchone()
    return int(row.id_persona)

# =========================
# USUARIOS CRUD (DEV)
# =========================

# @router.post("/usuarios", status_code=status.HTTP_201_CREATED)
# async def crear_usuario(payload: UsuarioCreate, db: AsyncSession = Depends(get_session), _=Depends(ensure_dev)):
#     if not password_is_strong(payload.contrasenia):
#         raise HTTPException(400, detail=password_strength_hint())
# 
#     id_persona = await _upsert_persona(db, payload.persona)
#     id_estado = await _estado_to_id(db, payload.estado)
#     hashed = hash_password(payload.contrasenia)
# 
#     try:
#         await db.execute(text("""
#             INSERT INTO usuarios (id_persona, correo, contrasenia_hash, id_estado_usuario)
#             VALUES (:idp, :c, :h, :e)
#         """), {"idp": id_persona, "c": payload.correo, "h": hashed, "e": id_estado})
#         await db.commit()
#     except Exception as ex:
#         await db.rollback()
#         raise HTTPException(400, detail=f"No se pudo crear usuario: {ex}")
# 
#     user_row = (await db.execute(text("SELECT id_usuario FROM usuarios WHERE correo=:c"), {"c": payload.correo})).fetchone()
#     id_usuario = int(user_row.id_usuario)
# 
#     if payload.roles:
#         await _set_user_roles(db, id_usuario, payload.roles)
#         await db.commit()
# 
#     out = (await db.execute(text("""
#         SELECT u.id_usuario, u.correo, eu.nombre AS estado,
#                COALESCE(GROUP_CONCAT(r.nombre), '') AS roles,
#                p.dni, p.apellido_paterno, p.apellido_materno, p.nombres
#         FROM usuarios u
#         JOIN estados_usuario eu ON eu.id_estado_usuario=u.id_estado_usuario
#         LEFT JOIN usuarios_roles ur ON ur.id_usuario=u.id_usuario
#         LEFT JOIN roles r ON r.id_rol=ur.id_rol
#         LEFT JOIN personas p ON p.id_persona=u.id_persona
#         WHERE u.id_usuario=:id
#         GROUP BY u.id_usuario
#     """), {"id": id_usuario})).fetchone()
# 
#     return {"ok": True, "data": {
#         "id_usuario": out.id_usuario,
#         "correo": out.correo,
#         "estado": out.estado,
#         "roles": [r for r in (out.roles or "").split(",") if r],
#         "persona": {
#             "dni": out.dni,
#             "apellido_paterno": out.apellido_paterno,
#             "apellido_materno": out.apellido_materno,
#             "nombres": out.nombres
#         }
#     }}

@router.get("/usuarios")
async def listar_usuarios(db: AsyncSession = Depends(get_session), _=Depends(ensure_dev)):
    res = await db.execute(text("""
        SELECT u.id_usuario, u.correo, eu.nombre AS estado,
               COALESCE(GROUP_CONCAT(r.nombre), '') AS roles,
               p.dni, p.apellido_paterno, p.apellido_materno, p.nombres
        FROM usuarios u
        JOIN estados_usuario eu ON eu.id_estado_usuario=u.id_estado_usuario
        LEFT JOIN usuarios_roles ur ON ur.id_usuario=u.id_usuario
        LEFT JOIN roles r ON r.id_rol=ur.id_rol
        LEFT JOIN personas p ON p.id_persona=u.id_persona
        GROUP BY u.id_usuario
        ORDER BY u.id_usuario DESC
    """))
    data = [{
        "id_usuario": row.id_usuario,
        "correo": row.correo,
        "estado": row.estado,
        "roles": [r for r in (row.roles or "").split(",") if r],
        "persona": {
            "dni": row.dni,
            "apellido_paterno": row.apellido_paterno,
            "apellido_materno": row.apellido_materno,
            "nombres": row.nombres
        }
    } for row in res.fetchall()]
    return {"ok": True, "data": data}

@router.patch("/usuarios/{id_usuario}")
async def actualizar_usuario(id_usuario: int, payload: UsuarioUpdate, db: AsyncSession = Depends(get_session), _=Depends(ensure_dev)):
    # actualizar PERSONA si llega
    if payload.persona is not None:
        _ = await _upsert_persona(db, payload.persona)  # asegura datos por DNI
        new_pid = (await db.execute(text("SELECT id_persona FROM personas WHERE dni=:d"), {"d": payload.persona.dni})).fetchone()
        await db.execute(text("UPDATE usuarios SET id_persona=:pid WHERE id_usuario=:id"), {"pid": int(new_pid.id_persona), "id": id_usuario})

    sets, params = [], {"id": id_usuario}
    if payload.correo is not None:
        sets.append("correo=:c"); params["c"] = payload.correo
    if payload.contrasenia is not None:
        if not password_is_strong(payload.contrasenia):
            raise HTTPException(400, detail=password_strength_hint())
        sets.append("contrasenia_hash=:h"); params["h"] = hash_password(payload.contrasenia)
    if payload.estado is not None:
        id_estado = await _estado_to_id(db, payload.estado)
        sets.append("id_estado_usuario=:e"); params["e"] = id_estado

    if sets:
        try:
            await db.execute(text(f"UPDATE usuarios SET {', '.join(sets)} WHERE id_usuario=:id"), params)
            await db.commit()
        except Exception as ex:
            await db.rollback()
            raise HTTPException(400, detail=f"No se pudo actualizar usuario: {ex}")

    if payload.roles is not None:
        await _set_user_roles(db, id_usuario, payload.roles)
        await db.commit()

    row = (await db.execute(text("""
        SELECT u.id_usuario, u.correo, eu.nombre AS estado,
               COALESCE(GROUP_CONCAT(r.nombre), '') AS roles,
               p.dni, p.apellido_paterno, p.apellido_materno, p.nombres
        FROM usuarios u
        JOIN estados_usuario eu ON eu.id_estado_usuario=u.id_estado_usuario
        LEFT JOIN usuarios_roles ur ON ur.id_usuario=u.id_usuario
        LEFT JOIN roles r ON r.id_rol=ur.id_rol
        LEFT JOIN personas p ON p.id_persona=u.id_persona
        WHERE u.id_usuario=:id
        GROUP BY u.id_usuario
    """), {"id": id_usuario})).fetchone()
    if not row:
        raise HTTPException(404, detail="Usuario no encontrado")

    return {"ok": True, "data": {
        "id_usuario": row.id_usuario,
        "correo": row.correo,
        "estado": row.estado,
        "roles": [r for r in (row.roles or "").split(",") if r],
        "persona": {
            "dni": row.dni,
            "apellido_paterno": row.apellido_paterno,
            "apellido_materno": row.apellido_materno,
            "nombres": row.nombres
        }
    }}

@router.delete("/usuarios/{id_usuario}", status_code=204)
async def eliminar_usuario(id_usuario: int, db: AsyncSession = Depends(get_session), _=Depends(ensure_dev)):
    await db.execute(text("DELETE FROM usuarios_roles WHERE id_usuario=:id"), {"id": id_usuario})
    res = await db.execute(text("DELETE FROM usuarios WHERE id_usuario=:id"), {"id": id_usuario})
    await db.commit()
    if res.rowcount == 0:
        raise HTTPException(404, detail="Usuario no encontrado")
    return {"ok": True}

# =========================
# ESTUDIANTES CRUD (DEV)
# =========================

@router.post("/estudiantes", status_code=status.HTTP_201_CREATED)
async def crear_estudiante(payload: EstudianteCreate, db: AsyncSession = Depends(get_session), _=Depends(ensure_dev)):
    id_persona = await _upsert_persona(db, payload.persona)
    try:
        await db.execute(text("""
          INSERT INTO estudiantes (id_persona, id_programa, anio_ingreso, id_estado_academico, codigo_alumno)
          VALUES (:idp, :prog, :anio, :estado, :codigo)
        """), {"idp": id_persona, "prog": payload.id_programa, "anio": payload.anio_ingreso,
               "estado": payload.id_estado_academico, "codigo": payload.codigo_alumno})
        await db.commit()
    except Exception as ex:
        await db.rollback()
        raise HTTPException(400, detail=f"No se pudo crear estudiante: {ex}")

    row = (await db.execute(text("""
        SELECT e.id_estudiante, e.codigo_alumno,
               p.dni, p.apellido_paterno, p.apellido_materno, p.nombres,
               e.id_programa, e.anio_ingreso, e.id_estado_academico
        FROM estudiantes e
        JOIN personas p ON p.id_persona=e.id_persona
        ORDER BY e.id_estudiante DESC LIMIT 1
    """))).fetchone()
    return {"ok": True, "data": dict(row._mapping)}

@router.get("/estudiantes")
async def listar_estudiantes(db: AsyncSession = Depends(get_session), _=Depends(ensure_dev)):
    res = await db.execute(text("""
        SELECT e.id_estudiante, e.codigo_alumno,
               p.dni, p.apellido_paterno, p.apellido_materno, p.nombres,
               e.id_programa, e.anio_ingreso, e.id_estado_academico
        FROM estudiantes e
        JOIN personas p ON p.id_persona=e.id_persona
        ORDER BY e.id_estudiante DESC
    """))
    return {"ok": True, "data": [dict(r._mapping) for r in res.fetchall()]}

@router.patch("/estudiantes/{id_estudiante}")
async def actualizar_estudiante(id_estudiante: int, payload: EstudianteUpdate, db: AsyncSession = Depends(get_session), _=Depends(ensure_dev)):
    # Persona (si llega)
    if payload.persona is not None:
        new_pid = await _upsert_persona(db, payload.persona)
        await db.execute(text("UPDATE estudiantes SET id_persona=:pid WHERE id_estudiante=:id"),
                         {"pid": new_pid, "id": id_estudiante})

    sets, params = [], {"id": id_estudiante}
    if payload.id_programa is not None: sets.append("id_programa=:prog"); params["prog"] = payload.id_programa
    if payload.anio_ingreso is not None: sets.append("anio_ingreso=:anio"); params["anio"] = payload.anio_ingreso
    if payload.id_estado_academico is not None: sets.append("id_estado_academico=:estado"); params["estado"] = payload.id_estado_academico
    if payload.codigo_alumno is not None: sets.append("codigo_alumno=:codigo"); params["codigo"] = payload.codigo_alumno

    if sets:
        try:
            await db.execute(text(f"UPDATE estudiantes SET {', '.join(sets)} WHERE id_estudiante=:id"), params)
            await db.commit()
        except Exception as ex:
            await db.rollback()
            raise HTTPException(400, detail=f"No se pudo actualizar estudiante: {ex}")

    row = (await db.execute(text("""
        SELECT e.id_estudiante, e.codigo_alumno,
               p.dni, p.apellido_paterno, p.apellido_materno, p.nombres,
               e.id_programa, e.anio_ingreso, e.id_estado_academico
        FROM estudiantes e
        JOIN personas p ON p.id_persona=e.id_persona
        WHERE e.id_estudiante=:id
    """), {"id": id_estudiante})).fetchone()
    if not row:
        raise HTTPException(404, detail="Estudiante no encontrado")
    return {"ok": True, "data": dict(row._mapping)}

@router.delete("/estudiantes/{id_estudiante}", status_code=204)
async def eliminar_estudiante(id_estudiante: int, db: AsyncSession = Depends(get_session), _=Depends(ensure_dev)):
    res = await db.execute(text("DELETE FROM estudiantes WHERE id_estudiante=:id"), {"id": id_estudiante})
    await db.commit()
    if res.rowcount == 0:
        raise HTTPException(404, detail="Estudiante no encontrado")
    return {"ok": True}


@router.post("/usuarios", status_code=status.HTTP_201_CREATED)
async def crear_usuario(payload: UsuarioCreate, db: AsyncSession = Depends(get_session), _=Depends(ensure_dev)):
    if not password_is_strong(payload.contrasenia):
        raise HTTPException(400, detail=password_strength_hint())

    # 1) upsert persona
    id_persona = await _upsert_persona(db, payload.persona)

    # 2) estado de usuario
    id_estado = await _estado_to_id(db, payload.estado)
    hashed = hash_password(payload.contrasenia)

    try:
        # 3) crear usuario
        await db.execute(text("""
            INSERT INTO usuarios (id_persona, correo, contrasenia_hash, id_estado_usuario)
            VALUES (:idp, :c, :h, :e)
        """), {"idp": id_persona, "c": payload.correo, "h": hashed, "e": id_estado})
        await db.commit()
    except Exception as ex:
        await db.rollback()
        raise HTTPException(400, detail=f"No se pudo crear usuario: {ex}")

    # 4) obtener id_usuario
    user_row = (await db.execute(text("SELECT id_usuario FROM usuarios WHERE correo=:c"), {"c": payload.correo})).fetchone()
    id_usuario = int(user_row.id_usuario)

    # 5) roles
    roles = payload.roles or []
    if roles:
        await _set_user_roles(db, id_usuario, roles)

    # 6) Perfiles por rol (en una sola transacción)
    try:
        # ESTUDIANTE
        if (payload.perfiles and payload.perfiles.estudiante) or ("estudiante" in roles):
            pe = payload.perfiles.estudiante if (payload.perfiles and payload.perfiles.estudiante) else PerfilEstudianteIn()
            await db.execute(SQL_INS_ESTUDIANTE, {
                "pid": id_persona,
                "prog": pe.id_programa,
                "anio": pe.anio_ingreso,
                "estado": pe.id_estado_academico,
                "codigo": pe.codigo_alumno,
            })

        # DOCENTE
        if (payload.perfiles and payload.perfiles.docente) or ("docente" in roles):
            pd = payload.perfiles.docente if (payload.perfiles and payload.perfiles.docente) else PerfilDocenteIn()
            await db.execute(SQL_INS_DOCENTE, {
                "pid": id_persona,
                "dep": pd.id_departamento,
                "cat": pd.categoria,
            })

        # AUTORIDAD
        if (payload.perfiles and payload.perfiles.autoridad) or ("autoridad" in roles):
            pa = payload.perfiles.autoridad if (payload.perfiles and payload.perfiles.autoridad) else PerfilAutoridadIn()
            await db.execute(SQL_INS_AUTORIDAD, {
                "pid": id_persona,
                "cargo": pa.id_cargo,
            })

        await db.commit()
    except Exception as ex:
        await db.rollback()
        raise HTTPException(400, detail=f"No se pudieron crear perfiles por rol: {ex}")

    # 7) salida
    out = (await db.execute(text("""
        SELECT u.id_usuario, u.correo, eu.nombre AS estado,
               COALESCE(GROUP_CONCAT(r.nombre), '') AS roles,
               p.dni, p.apellido_paterno, p.apellido_materno, p.nombres
        FROM usuarios u
        JOIN estados_usuario eu ON eu.id_estado_usuario=u.id_estado_usuario
        LEFT JOIN usuarios_roles ur ON ur.id_usuario=u.id_usuario
        LEFT JOIN roles r ON r.id_rol=ur.id_rol
        LEFT JOIN personas p ON p.id_persona=u.id_persona
        WHERE u.id_usuario=:id
        GROUP BY u.id_usuario
    """), {"id": id_usuario})).fetchone()

    return {"ok": True, "data": {
        "id_usuario": out.id_usuario,
        "correo": out.correo,
        "estado": out.estado,
        "roles": [r for r in (out.roles or "").split(",") if r],
        "persona": {
            "dni": out.dni,
            "apellido_paterno": out.apellido_paterno,
            "apellido_materno": out.apellido_materno,
            "nombres": out.nombres
        }
    }}


"""
alertas;
asistencias;
bitacora_auditoria;
calificaciones;
cursos;
docentes;
matriculas;
permisos;
puntajes_riesgo;
roles_permisos;
sesiones_tutoria;
trabajos_sincronizacion;
tutores;
"""