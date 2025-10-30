# app/routers/fse.py
from __future__ import annotations
from typing import Optional, List, Any, Mapping

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator
from sqlalchemy import text
from sqlalchemy.engine import Row, RowMapping
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import require_roles
from ..schemas import ApiResponse

router = APIRouter(prefix="/fse", tags=["ficha_socioeconomica"])

# ---------------------------
# Utils: coerción a tipos JSON
# ---------------------------
def _coerce(obj: Any) -> Any:
    """Convierte Row/RowMapping/listas anidadas a dict/list para que Pydantic pueda serializar."""
    if obj is None:
        return None
    if isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, (Row, RowMapping, Mapping)):
        return {k: _coerce(v) for k, v in dict(obj).items()}
    if isinstance(obj, (list, tuple, set)):
        return [_coerce(x) for x in obj]
    return obj  # fallback (ya debe ser serializable)

# ---------------------------
# Schemas
# ---------------------------
class FichaNuevaIn(BaseModel):
    id_periodo: int = Field(..., ge=1)
    observaciones: Optional[str] = None

class RespuestaItemIn(BaseModel):
    codigo: str = Field(..., min_length=2, max_length=50)  # ej. PROC, SIFE, VIVI, PROM...
    id_opcion: Optional[int] = None       # para ítems de catálogo
    valor_numero: Optional[float] = None  # para numérico/moneda/booleano
    valor_texto: Optional[str] = None     # para texto/fecha
    puntos: Optional[int] = None          # opcional; catálogo se sobreescribe con puntos de la opción

    @validator("codigo")
    def _upcase(cls, v: str) -> str:
        return v.strip().upper()

class RespuestasIn(BaseModel):
    respuestas: List[RespuestaItemIn]
    autocalcular: bool = True

# ---------------------------
# SQL Snippets
# ---------------------------
SQL_EXISTE_ESTUDIANTE = text("SELECT 1 FROM estudiantes WHERE id_estudiante=:id LIMIT 1")
SQL_EXISTE_PERIODO   = text("SELECT 1 FROM periodos_academicos WHERE id_periodo=:id LIMIT 1")

SQL_EXISTE_FICHA = text("""
SELECT id_ficha FROM fichas_socioeconomicas
WHERE id_estudiante=:est AND id_periodo=:per
LIMIT 1
""")

SQL_INSERT_FICHA = text("""
INSERT INTO fichas_socioeconomicas (id_estudiante, id_periodo, observaciones)
VALUES (:est, :per, :obs)
""")

SQL_SELECT_ID_FICHA_RECIENTE = text("""
SELECT id_ficha
FROM fichas_socioeconomicas
WHERE id_estudiante=:est AND id_periodo=:per
ORDER BY id_ficha DESC
LIMIT 1
""")

SQL_SELECT_FICHA = text("""
SELECT id_ficha, id_estudiante, id_periodo
FROM fichas_socioeconomicas
WHERE id_ficha=:idf
LIMIT 1
""")

SQL_LIST_ITEMS = text("""
SELECT id_item, codigo, nombre, id_tipo_item, obligatorio, peso_puntos
FROM items_fse
ORDER BY id_item
""")

SQL_ITEM_BY_COD = text("""
SELECT i.id_item, i.codigo, i.id_tipo_item, i.peso_puntos
FROM items_fse i
WHERE i.codigo=:cod
LIMIT 1
""")

SQL_OPCION_BY_ID = text("""
SELECT id_opcion, id_item, etiqueta, valor_catalogo, puntos
FROM opciones_item_fse
WHERE id_opcion=:idop
LIMIT 1
""")

SQL_OPCIONES_BY_COD = text("""
SELECT o.id_opcion, o.id_item, o.etiqueta, o.valor_catalogo, o.puntos
FROM opciones_item_fse o
JOIN items_fse i ON i.id_item=o.id_item
WHERE i.codigo=:cod
ORDER BY o.id_opcion
""")

# UNIQUE (id_ficha, id_item) requerido en respuestas_fse
SQL_UPSERT_RESP = text("""
INSERT INTO respuestas_fse (id_ficha, id_item, id_opcion, valor_numero, valor_texto, puntos)
VALUES (:idf, :idi, :idop, :vnum, :vtxt, :pts)
ON DUPLICATE KEY UPDATE
  id_opcion    = VALUES(id_opcion),
  valor_numero = VALUES(valor_numero),
  valor_texto  = VALUES(valor_texto),
  puntos       = VALUES(puntos)
""")

# Recalcular en la misma transacción (sin SP)
SQL_UPDATE_TOTAL = text("""
UPDATE fichas_socioeconomicas f
SET f.total_puntos = (
  SELECT COALESCE(SUM(r.puntos), 0)
  FROM respuestas_fse r
  WHERE r.id_ficha=f.id_ficha
)
WHERE f.id_ficha=:idf
""")

SQL_UPDATE_CLAS = text("""
UPDATE fichas_socioeconomicas f
JOIN clasificaciones_fse c
  ON f.total_puntos BETWEEN c.puntos_min AND c.puntos_max
SET f.id_clasificacion=c.id_clasificacion
WHERE f.id_ficha=:idf
""")

SQL_RESUMEN_FICHA = text("SELECT * FROM v_resumen_ficha WHERE id_ficha=:idf LIMIT 1")

# ============================================================
# Endpoints
# ============================================================

@router.get(
    "/items",
    response_model=ApiResponse,
    dependencies=[Depends(require_roles("admin", "autoridad", "tutor"))],
    summary="Lista todos los ítems FSE"
)
async def listar_items(db: AsyncSession = Depends(get_session)):
    rows = (await db.execute(SQL_LIST_ITEMS)).mappings().all()
    return {"ok": True, "data": _coerce(rows)}

@router.get(
    "/items/{codigo}/opciones",
    response_model=ApiResponse,
    dependencies=[Depends(require_roles("admin", "autoridad", "tutor"))],
    summary="Lista opciones del ítem de catálogo (por código)"
)
async def opciones_por_codigo(codigo: str, db: AsyncSession = Depends(get_session)):
    it = (await db.execute(SQL_ITEM_BY_COD, {"cod": codigo.strip().upper()})).mappings().first()
    if not it:
        raise HTTPException(status_code=404, detail=f"Ítem inexistente: {codigo}")
    if int(it["id_tipo_item"]) != 1:
        raise HTTPException(status_code=400, detail=f"El ítem {codigo} no es de tipo catálogo")
    rows = (await db.execute(SQL_OPCIONES_BY_COD, {"cod": it["codigo"]})).mappings().all()
    return {"ok": True, "data": _coerce(rows)}

@router.post(
    "/{id_estudiante}/nueva",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "autoridad"))],
    summary="Crea una ficha socioeconómica (única por estudiante+periodo)"
)
async def crear_ficha(
    id_estudiante: int,
    payload: FichaNuevaIn,
    db: AsyncSession = Depends(get_session),
):
    # Validaciones
    if not (await db.execute(SQL_EXISTE_ESTUDIANTE, {"id": id_estudiante})).fetchone():
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    if not (await db.execute(SQL_EXISTE_PERIODO, {"id": payload.id_periodo})).fetchone():
        raise HTTPException(status_code=404, detail="Periodo no encontrado")

    # Unicidad
    dup = (await db.execute(SQL_EXISTE_FICHA, {"est": id_estudiante, "per": payload.id_periodo})).fetchone()
    if dup:
        raise HTTPException(status_code=409, detail="Ya existe una ficha para este estudiante en ese periodo")

    # Crear
    try:
        await db.execute(SQL_INSERT_FICHA, {"est": id_estudiante, "per": payload.id_periodo, "obs": payload.observaciones})
        await db.commit()
    except Exception as ex:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"No se pudo crear la ficha: {ex}")

    row = (await db.execute(SQL_SELECT_ID_FICHA_RECIENTE, {"est": id_estudiante, "per": payload.id_periodo})).fetchone()
    id_ficha = int(row.id_ficha)

    return {"ok": True, "message": "Ficha creada", "data": {"id_ficha": id_ficha, "id_estudiante": id_estudiante, "id_periodo": payload.id_periodo}}

@router.post(
    "/{id_ficha}/respuestas",
    response_model=ApiResponse,
    dependencies=[Depends(require_roles("admin", "autoridad"))],
    summary="UPSERT de respuestas FSE por códigos (respeta tipos y recalcula totales/clasificación)"
)
async def upsert_respuestas_fse(
    id_ficha: int,
    payload: RespuestasIn,
    db: AsyncSession = Depends(get_session),
):
    # Validar ficha
    if not (await db.execute(SQL_SELECT_FICHA, {"idf": id_ficha})).fetchone():
        raise HTTPException(status_code=404, detail="Ficha no encontrada")

    try:
        for r in payload.respuestas:
            cod = r.codigo.strip().upper()
            it = (await db.execute(SQL_ITEM_BY_COD, {"cod": cod})).mappings().first()
            if not it:
                raise HTTPException(status_code=400, detail=f"Código de ítem inválido o no registrado: {cod}")

            id_item = int(it["id_item"])
            tipo    = int(it["id_tipo_item"])

            id_opcion    = None
            valor_numero = None
            valor_texto  = None
            puntos       = r.puntos if r.puntos is not None else 0

            if tipo == 1:  # catálogo
                if not r.id_opcion:
                    raise HTTPException(status_code=400, detail=f"El ítem {cod} es de tipo catálogo: envía 'id_opcion'")
                op = (await db.execute(SQL_OPCION_BY_ID, {"idop": r.id_opcion})).mappings().first()
                if not op or int(op["id_item"]) != id_item:
                    raise HTTPException(status_code=400, detail=f"id_opcion inválido para el ítem {cod}")
                id_opcion = int(op["id_opcion"])
                puntos    = int(op["puntos"])  # puntos de catálogo vienen de la opción

            elif tipo in (2, 3):  # número / moneda
                valor_numero = r.valor_numero
                # puntos opcional (conserva si lo envían); si no, queda 0

            elif tipo == 4:  # texto
                valor_texto = r.valor_texto

            elif tipo == 5:  # booleano (convención 1/0 en valor_numero)
                if r.valor_numero is None and r.valor_texto:
                    valor_numero = 1.0 if r.valor_texto.strip().upper() in ("SI", "SÍ", "TRUE", "1") else 0.0
                else:
                    valor_numero = r.valor_numero

            elif tipo == 6:  # fecha
                valor_texto = r.valor_texto

            await db.execute(
                SQL_UPSERT_RESP,
                {"idf": id_ficha, "idi": id_item, "idop": id_opcion, "vnum": valor_numero, "vtxt": valor_texto, "pts": puntos},
            )

        await db.commit()

        if payload.autocalcular:
            await db.execute(SQL_UPDATE_TOTAL, {"idf": id_ficha})
            await db.execute(SQL_UPDATE_CLAS, {"idf": id_ficha})
            await db.commit()

    except HTTPException:
        raise
    except Exception as ex:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error guardando respuestas: {ex}")

    return {"ok": True, "message": "Respuestas guardadas" + (" y ficha recalculada" if payload.autocalcular else ""), "data": {"id_ficha": id_ficha, "items_actualizados": len(payload.respuestas)}}

@router.get(
    "/{id_ficha}/resumen",
    response_model=ApiResponse,
    dependencies=[Depends(require_roles("admin", "autoridad", "tutor"))],
    summary="Resumen legible (v_resumen_ficha)"
)
async def resumen_ficha(id_ficha: int, db: AsyncSession = Depends(get_session)):
    row = (await db.execute(SQL_RESUMEN_FICHA, {"idf": id_ficha})).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Resumen no disponible (ficha inexistente o sin datos)")
    return {"ok": True, "data": _coerce(row)}
