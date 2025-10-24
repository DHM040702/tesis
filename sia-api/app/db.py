# app/db.py
import os
from typing import AsyncIterator

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy import text

# Carga variables del .env
load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")

# URL de conexión asíncrona (driver aiomysql)
DATABASE_URL = (
    f"mysql+aiomysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    "?charset=utf8mb4"
)

# Motor asíncrono (pool de conexiones)
# - pool_pre_ping: verifica conexiones antes de usarlas (evita 'MySQL server has gone away')
# - pool_recycle: recicla conexiones inactivas (segundos)
engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=False,                 # pon True si quieres ver SQL en consola (modo debug)
    pool_pre_ping=True,
    pool_recycle=3600,
    # future=True  # (en 2.0 ya es el comportamiento por defecto)
)

# Fábrica de sesiones asíncronas
SessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,     # no expira objetos al hacer commit (más cómodo para APIs)
    autoflush=False,
    class_=AsyncSession,
)

async def get_session() -> AsyncIterator[AsyncSession]:
    """
    Dependencia para FastAPI.
    Abre una sesión por request y la cierra al finalizar.
    """
    async with SessionLocal() as session:
        yield session

# ---------- Utilidades opcionales -----------

async def db_healthcheck() -> bool:
    """
    Ejecuta un 'SELECT 1' para verificar que la conexión funciona.
    Útil para endpoints /health o en eventos de startup.
    """
    try:
        async with SessionLocal() as s:
            await s.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

async def run_sp(session: AsyncSession, sp_sql: str, params: dict | None = None) -> None:
    """
    Ejecuta un Stored Procedure (CALL ...) y hace commit.
    Ejemplo de uso:
        await run_sp(db, "CALL sp_recalcular_riesgo_periodo(:p)", {"p": 1})
    """
    await session.execute(text(sp_sql), params or {})
    await session.commit()
