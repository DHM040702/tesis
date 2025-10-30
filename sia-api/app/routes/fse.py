# app/routers/fse.py
from __future__ import annotations
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import require_roles
from ..schemas import ApiResponse

router = APIRouter(prefix="/fse", tags=["ficha_socioeconomica"])

# ============================================================
# Pydantic Schemas
# ============================================================

class FichaNuevaIn(BaseModel):
    id_periodo: int = Field(..., ge=1)
    observaciones: Optional[str] = None


class RespuestaItemIn(BaseModel):
    """
    Carga/actualiza una respuesta de FSE para un item identificado por su 'codigo' (items_fse.codigo).
    Reglas por tipo (según BD_Final):
      - catalogo (id_tipo_item=1):     Requiere id_opcion. puntos se toma de opciones_item_fse.puntos.
      - numero / moneda (2/3):         Usar valor_numero; puntos opcional (si tu lógica lo requiere).
      - texto (4):                      Usar valor_texto.
      - booleano (5):                   Usar valor_numero como 0/1 (o texto "SI/NO" si prefieres).
      - fecha (6):                      Usar valor_texto (ISO-8601) o tu formato elegido.
    Nota: La vista v_resumen_ficha:
      - Lee texts de opciones (PROC/VIVI/ORFA) => debes enviar id_opcion para esos códigos.
      - Lee valor_numero para PROM, SIFE, CARG, DEPE, PENS (ver vista).
    """
    codigo: str = Field(..., min_length=3, max_length=50)
    id_opcion: Optional[int] = None
    valor_numero: Optional[float] = None
    valor_texto: Optional[str] = None
    puntos: Optional[int] = None  # opcional; catálogo se sobrescribe con el de la opción

    @validator("codigo")
    def _upcase(cls, v: str) -> str:
        return v.strip().upper()


class RespuestasIn(BaseModel):
    respuestas: List[RespuestaItemIn]
    autocalcular: bool = True  # recalcula totales + clasificación


# ============================================================
# SQL Snippets
# ============================================================

SQL_EXISTE_ESTUDIANTE = text("""
SELECT 1 FROM estudiantes WHERE id_estudiante = :id LIMIT 1
""")

SQL_EXISTE_PERIODO = text("""
SELECT 1 FROM periodos_academicos WHERE id_periodo = :id LIMIT 1
""")

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

SQL_ITEM_BY_COD = text("""
SELECT i.id_item, i.codigo, i.id_tipo_item, i.peso_puntos
FROM items_fse i
WHERE i.codigo = :cod
LIMIT 1
""")

SQL_OPCION_BY_ID = text("""
SELECT id_opcion, id_item, etiqueta, valor_catalogo, puntos
FROM opciones_item_fse
WHERE id_opcion = :idop
LIMIT 1
""")

SQL_OPCIONES_BY_COD = text("""
SELECT o.id_opcion, o.id_item, o.etiqueta, o.valor_catalogo, o.puntos
FROM opciones_item_fse o
JOIN items_fse i ON i.id_item = o.id_item
WHERE i.codigo = :cod
ORDER BY o.id_opcion
""")

SQL_LIST_ITEMS = text("""
SELECT id_item, codigo, nombre, id_tipo_item, obligatorio, peso_puntos
FROM items_fse
ORDER BY id_item
""")

# ON DUPLICATE por unique (id_ficha, id_item)
SQL_UPSERT_RESP = text("""
INSERT INTO respuestas_fse (id_ficha, id_item, id_opcion, valor_numero, valor_texto, puntos)
VALUES (:idf, :idi, :idop, :vnum, :vtxt, :pts)
ON DUPLICATE KEY UPDATE
  id_opcion    = VALUES(id_opcion),
  valor_numero = VALUES(valor_numero),
  valor_texto  = VALUES(valor_texto),
  puntos       = VALUES(puntos)
""")

# Recalcular totals & clasificacion SIN SP
SQL_UPDATE_TOTAL = text("""
UPDATE fichas_socioeconomicas f
SET f.total_puntos = (
  SELECT COALESCE(SUM(r.puntos), 0)
  FROM respuestas_fse r
  WHERE r.id_ficha = f.id_ficha
)
WHERE f.id_ficha = :idf
""")

SQL_UPDATE_CLAS = text("""
UPDATE fichas_socioeconomicas f
JOIN clasificaciones_fse c
  ON f.total_puntos BETWEEN c.puntos_min AND c.puntos_max
SET f.id_clasificacion = c.id_clasificacion
WHERE f.id_ficha = :idf
""")

SQL_RESUMEN_FICHA = text("""
SELECT *
FROM v_resumen_ficha
WHERE id_ficha = :idf
LIMIT 1
""")


# ============================================================
# Endpoints
# ============================================================

@router.get(
    "/items",
    response_model=ApiResponse,
    dependencies=[Depends(require_roles("admin", "autoridad", "tutor"))],
    summary="Lista todos los ítems FSE (catálogo, número, texto, etc.)"
)
async def listar_items(db: AsyncSession = Depends(get_session)):
    rows = (await db.execute(SQL_LIST_ITEMS)).mappings().all()
    return {"ok": True, "data": rows}


@router.get(
    "/items/{codigo}/opciones",
    response_model=ApiResponse,
    dependencies=[Depends(require_roles("admin", "autoridad", "tutor"))],
    summary="Lista opciones del ítem de tipo catálogo por código (ej. PROC, VIVI, ORFA)"
)
async def opciones_por_codigo(codigo: str, db: AsyncSession = Depends(get_session)):
    codigo = codigo.strip().upper()
    # Validar que el item exista
    it = (await db.execute(SQL_ITEM_BY_COD, {"cod": codigo})).mappings().first()
    if not it:
        raise HTTPException(404, detail=f"Ítem inexistente: {codigo}")
    if it["id_tipo_item"] != 1:  # 1 = catálogo
        raise HTTPException(400, detail=f"El ítem {codigo} no es de tipo catálogo")

    rows = (await db.execute(SQL_OPCIONES_BY_COD, {"cod": codigo})).mappings().all()
    return {"ok": True, "data": rows}


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
        raise HTTPException(404, "Estudiante no encontrado")
    if not (await db.execute(SQL_EXISTE_PERIODO, {"id": payload.id_periodo})).fetchone():
        raise HTTPException(404, "Periodo no encontrado")

    # Unicidad
    dup = (await db.execute(SQL_EXISTE_FICHA, {"est": id_estudiante, "per": payload.id_periodo})).fetchone()
    if dup:
        raise HTTPException(409, "Ya existe una ficha para este estudiante en ese periodo")

    # Insertar
    try:
        await db.execute(SQL_INSERT_FICHA, {"est": id_estudiante, "per": payload.id_periodo, "obs": payload.observaciones})
        await db.commit()
    except Exception as ex:
        await db.rollback()
        raise HTTPException(400, f"No se pudo crear la ficha: {ex}")

    # Id recién creado
    row = (await db.execute(SQL_SELECT_ID_FICHA_RECIENTE, {"est": id_estudiante, "per": payload.id_periodo})).fetchone()
    id_ficha = int(row.id_ficha)

    # Sugerencia: crear placeholder de CLAS (opcional; la vista no lo requiere)
    # -- omitido a propósito; se calculará con total_puntos

    return {"ok": True, "message": "Ficha creada", "data": {"id_ficha": id_ficha, "id_estudiante": id_estudiante, "id_periodo": payload.id_periodo}}


@router.post(
    "/{id_ficha}/respuestas",
    response_model=ApiResponse,
    dependencies=[Depends(require_roles("admin", "autoridad"))],
    summary="UPSERT de respuestas FSE por códigos (respeta tipo de ítem y recalcula totales/clasificación)"
)
async def upsert_respuestas_fse(
    id_ficha: int,
    payload: RespuestasIn,
    db: AsyncSession = Depends(get_session),
):
    # 0) Validar ficha
    row_ficha = (await db.execute(SQL_SELECT_FICHA, {"idf": id_ficha})).fetchone()
    if not row_ficha:
        raise HTTPException(404, "Ficha no encontrada")

    try:
        # Por cada respuesta, resolver item y preparar valores según tipo
        for r in payload.respuestas:
            it = (await db.execute(SQL_ITEM_BY_COD, {"cod": r.codigo})).mappings().first()
            if not it:
                raise HTTPException(400, f"Código de ítem inválido o no registrado: {r.codigo}")

            id_item = int(it["id_item"])
            tipo = int(it["id_tipo_item"])

            id_opcion = None
            valor_numero = None
            valor_texto = None
            puntos = r.puntos if r.puntos is not None else 0

            if tipo == 1:  # catálogo
                if not r.id_opcion:
                    raise HTTPException(400, f"El ítem {r.codigo} es de tipo catálogo: envía 'id_opcion'")
                op = (await db.execute(SQL_OPCION_BY_ID, {"idop": r.id_opcion})).mappings().first()
                if not op or int(op["id_item"]) != id_item:
                    raise HTTPException(400, f"id_opcion inválido para el ítem {r.codigo}")
                id_opcion = int(op["id_opcion"])
                puntos = int(op["puntos"])  # los puntos del catálogo mandan
                # La vista toma texto (PROC/VIVI/ORFA) desde opciones, no desde valor_texto

            elif tipo in (2, 3):  # numero / moneda
                # v_resumen_ficha lee valor_numero para PROM, SIFE, CARG, DEPE, PENS
                if r.valor_numero is None and r.puntos is None:
                    # aceptamos 0 como default si no envían nada
                    valor_numero = None
                    puntos = 0
                else:
                    valor_numero = r.valor_numero
                    # puntos opcional según tu rúbrica; conservar lo recibido o 0

            elif tipo == 4:  # texto
                valor_texto = r.valor_texto

            elif tipo == 5:  # booleano
                # convención: 1/0 en valor_numero; puntos opcionales
                if r.valor_numero is None and r.valor_texto:
                    valor_numero = 1.0 if r.valor_texto.strip().upper() in ("SI", "SÍ", "TRUE", "1") else 0.0
                else:
                    valor_numero = r.valor_numero

            elif tipo == 6:  # fecha
                # guardamos como texto ISO, o el formato que envíes
                valor_texto = r.valor_texto

            # UPSERT
            await db.execute(
                SQL_UPSERT_RESP,
                {"idf": id_ficha, "idi": id_item, "idop": id_opcion, "vnum": valor_numero, "vtxt": valor_texto, "pts": puntos},
            )

        await db.commit()

        # Recalcular totales + clasificacion si corresponde
        if payload.autocalcular:
            await db.execute(SQL_UPDATE_TOTAL, {"idf": id_ficha})
            await db.execute(SQL_UPDATE_CLAS, {"idf": id_ficha})
            await db.commit()

    except HTTPException:
        raise
    except Exception as ex:
        await db.rollback()
        raise HTTPException(400, f"Error guardando respuestas: {ex}")

    return {
        "ok": True,
        "message": "Respuestas guardadas" + (" y ficha recalculada" if payload.autocalcular else ""),
        "data": {"id_ficha": id_ficha, "items_actualizados": len(payload.respuestas)},
    }


@router.get(
    "/{id_ficha}/resumen",
    response_model=ApiResponse,
    dependencies=[Depends(require_roles("admin", "autoridad", "tutor"))],
    summary="Resumen legible de la ficha (v_resumen_ficha)"
)
async def resumen_ficha(
    id_ficha: int,
    db: AsyncSession = Depends(get_session),
):
    row = (await db.execute(SQL_RESUMEN_FICHA, {"idf": id_ficha})).mappings().first()
    if not row:
        raise HTTPException(404, "Resumen no disponible (ficha inexistente o sin datos)")
    return {"ok": True, "data": dict(row)}
