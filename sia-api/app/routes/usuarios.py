# app/routers/usuarios.py
from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from ..db import get_session
from ..deps import get_current_user
from ..schemas import ApiResponse

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

@router.get("/me", response_model=ApiResponse)
async def me(user=Depends(get_current_user), db: AsyncSession = Depends(get_session)):
    q = text("""
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
    """)
    res = await db.execute(q, {"id": user["id_usuario"]})
    row = res.fetchone()
    if not row:
        return {"ok": True, "data": None}
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
