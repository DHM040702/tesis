# app/routers/auth.py
from __future__ import annotations
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..security import (
    verify_password, hash_password,
    create_access_token, create_refresh_token,
    decode_refresh_token, sha256_hex, extract_user_identity
)
from ..deps import get_current_user  # usa access token

router = APIRouter(prefix="/auth", tags=["auth"])

# ==========================
# Esquemas
# ==========================
class LoginIn(BaseModel):
    correo: EmailStr
    contrasenia: str

class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshIn(BaseModel):
    refresh_token: str

class LogoutIn(BaseModel):
    refresh_token: str


# ==========================
# Helpers SQL
# ==========================
SQL_USER_BY_EMAIL = text("""
    SELECT u.id_usuario, u.contrasenia_hash, u.correo,
           COALESCE(GROUP_CONCAT(r.nombre), '') AS roles
    FROM usuarios u
    LEFT JOIN usuarios_roles ur ON ur.id_usuario=u.id_usuario
    LEFT JOIN roles r ON r.id_rol=ur.id_rol
    WHERE u.correo=:c
    GROUP BY u.id_usuario
    LIMIT 1
""")

SQL_INSERT_REFRESH = text("""
    INSERT INTO refresh_tokens (id_usuario, jti, token_hash, user_agent, ip, expiracion)
    VALUES (:uid, :jti, :th, :ua, :ip, :exp)
""")

SQL_GET_REFRESH = text("""
    SELECT id_refresh, id_usuario, jti, token_hash, expiracion, revocado
    FROM refresh_tokens
    WHERE jti=:jti
    LIMIT 1
""")

SQL_REVOKE_REFRESH = text("""
    UPDATE refresh_tokens SET revocado=1 WHERE jti=:jti
""")

SQL_REVOKE_ALL_FOR_USER = text("""
    UPDATE refresh_tokens SET revocado=1 WHERE id_usuario=:uid AND revocado=0
""")


# ==========================
# POST /auth/login
# ==========================
@router.post("/login", response_model=TokenOut)
async def login(payload: LoginIn, request: Request, db: AsyncSession = Depends(get_session)):
    dump = payload.model_dump()
    dump["correo"] = str(payload.correo)
    print(f"[auth.login] URL destino: {request.url}")
    print(f"[auth.login] Payload recibido: {dump}")
    # 1) buscar usuario
    row = (await db.execute(SQL_USER_BY_EMAIL, {"c": payload.correo})).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")
    # 2) validar password
    if not verify_password(payload.contrasenia, row.contrasenia_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

    roles = [r for r in (row.roles or "").split(",") if r]
    uid = int(row.id_usuario)

    # 3) crear access token
    access = create_access_token(user_id=uid, email=row.correo, roles=roles)

    # 4) crear refresh token (JWT con jti) y almacenar su hash
    refresh = create_refresh_token(user_id=uid)
    refresh_payload = decode_refresh_token(refresh)
    if not refresh_payload:
        raise HTTPException(500, detail="No se pudo emitir refresh token")

    ua = request.headers.get("user-agent", "")[:255]
    ip = request.client.host if request.client else None
    th = sha256_hex(refresh)
    exp_dt = datetime_from_epoch(refresh_payload["exp"])

    await db.execute(SQL_INSERT_REFRESH, {
        "uid": uid, "jti": refresh_payload["jti"], "th": th, "ua": ua, "ip": ip, "exp": exp_dt
    })
    await db.commit()

    return TokenOut(access_token=access, refresh_token=refresh)


# ==========================
# POST /auth/refresh
# ==========================
@router.post("/refresh", response_model=TokenOut)
async def refresh_token(payload: RefreshIn, request: Request, db: AsyncSession = Depends(get_session)):
    # 1) decodificar JWT refresh
    rp = decode_refresh_token(payload.refresh_token)
    if not rp:
        raise HTTPException(status_code=401, detail="Refresh token inválido")

    # 2) recuperar registro en BD por jti
    row = (await db.execute(SQL_GET_REFRESH, {"jti": rp["jti"]})).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Refresh token no reconocido")
    if row.revocado:
        raise HTTPException(status_code=401, detail="Refresh token revocado")
    if datetime_from_epoch(rp["exp"]) <= now():
        # expira por payload — seguridad extra: revocar el registro
        await db.execute(SQL_REVOKE_REFRESH, {"jti": rp["jti"]})
        await db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expirado")
    # comparar hash
    if sha256_hex(payload.refresh_token) != row.token_hash:
        raise HTTPException(status_code=401, detail="Refresh token no coincide")

    uid = int(row.id_usuario)

    # 3) ROTAR: revocar viejo y emitir par nuevo
    await db.execute(SQL_REVOKE_REFRESH, {"jti": rp["jti"]})
    await db.commit()

    # obtener email y roles para el nuevo access
    uinfo = (await db.execute(text("""
        SELECT u.correo, COALESCE(GROUP_CONCAT(r.nombre), '') AS roles
        FROM usuarios u
        LEFT JOIN usuarios_roles ur ON ur.id_usuario=u.id_usuario
        LEFT JOIN roles r ON r.id_rol=ur.id_rol
        WHERE u.id_usuario=:uid
        GROUP BY u.id_usuario
        """), {"uid": uid})).fetchone()
    email = uinfo.correo
    roles = [r for r in (uinfo.roles or "").split(",") if r]

    new_access = create_access_token(user_id=uid, email=email, roles=roles)
    new_refresh = create_refresh_token(user_id=uid)
    nrp = decode_refresh_token(new_refresh)
    ua = request.headers.get("user-agent", "")[:255]
    ip = request.client.host if request.client else None
    th = sha256_hex(new_refresh)
    exp_dt = datetime_from_epoch(nrp["exp"])

    await db.execute(SQL_INSERT_REFRESH, {
        "uid": uid, "jti": nrp["jti"], "th": th, "ua": ua, "ip": ip, "exp": exp_dt
    })
    await db.commit()

    return TokenOut(access_token=new_access, refresh_token=new_refresh)


# ==========================
# POST /auth/logout
# ==========================
@router.post("/logout")
async def logout(payload: LogoutIn, db: AsyncSession = Depends(get_session)):
    rp = decode_refresh_token(payload.refresh_token)
    if not rp:
        raise HTTPException(status_code=400, detail="Refresh token inválido")
    await db.execute(SQL_REVOKE_REFRESH, {"jti": rp["jti"]})
    await db.commit()
    return {"ok": True, "message": "Sesión cerrada (refresh revocado)."}


# ==========================
# POST /auth/logout_all
# ==========================
@router.post("/logout_all")
async def logout_all(user=Depends(get_current_user), db: AsyncSession = Depends(get_session)):
    await db.execute(SQL_REVOKE_ALL_FOR_USER, {"uid": user["id_usuario"]})
    await db.commit()
    return {"ok": True, "message": "Todas las sesiones cerradas para el usuario."}


# ==========================
# Utils locales
# ==========================
from datetime import datetime, timezone
def now() -> datetime:                                                          
    return datetime.now(timezone.utc)
def datetime_from_epoch(ts: int) -> datetime:
    return datetime.fromtimestamp(ts, tz=timezone.utc)
