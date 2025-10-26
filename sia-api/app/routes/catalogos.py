# app/routers/catalogos.py
from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from ..db import get_session
from ..deps import require_roles
from ..schemas import ApiResponse

router = APIRouter(prefix="/catalogos", tags=["catalogos"])

@router.get("/periodos", response_model=ApiResponse, dependencies=[Depends(require_roles("admin","autoridad","tutor","docente"))])
async def periodos(db: AsyncSession = Depends(get_session)):
    res = await db.execute(text("SELECT * FROM periodos_academicos ORDER BY id_periodo DESC"))
    return {"ok": True, "data": [dict(r._mapping) for r in res.fetchall()]}

@router.get("/programas", response_model=ApiResponse, dependencies=[Depends(require_roles("admin","autoridad","tutor","docente"))])
async def programas(db: AsyncSession = Depends(get_session)):
    res = await db.execute(text("SELECT id_programa, nombre FROM programas ORDER BY nombre ASC"))
    return {"ok": True, "data": [dict(r._mapping) for r in res.fetchall()]}

@router.get("/facultades", response_model=ApiResponse, dependencies=[Depends(require_roles("admin","autoridad","tutor","docente"))])
async def facultades(db: AsyncSession = Depends(get_session)):
    res = await db.execute(text("SELECT id_facultad, nombre FROM facultades ORDER BY nombre ASC"))
    return {"ok": True, "data": [dict(r._mapping) for r in res.fetchall()]}

@router.get("/niveles-riesgo", response_model=ApiResponse, dependencies=[Depends(require_roles("admin","autoridad","tutor","docente"))])
async def niveles_riesgo(db: AsyncSession = Depends(get_session)):
    res = await db.execute(text("SELECT * FROM niveles_riesgo ORDER BY id_nivel_riesgo ASC"))
    return {"ok": True, "data": [dict(r._mapping) for r in res.fetchall()]}
