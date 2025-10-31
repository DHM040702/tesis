# app/main.py
from fastapi import FastAPI
from .routes import auth, usuarios, estudiantes, riesgo, alertas, fse, dev,academico, catalogos, tutorias
import os
from fastapi.middleware.cors import CORSMiddleware

DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"

def _allowed_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "")
    if raw.strip():
        return [origin.strip() for origin in raw.split(",") if origin.strip()]
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]



app = FastAPI(title="SIA-UNASAM API (FastAPI)", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_cors_origins(),  # Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router, prefix="/api")
app.include_router(usuarios.router, prefix="/api")
app.include_router(estudiantes.router, prefix="/api")
app.include_router(riesgo.router, prefix="/api")
app.include_router(alertas.router, prefix="/api")
app.include_router(fse.router, prefix="/api")
app.include_router(academico.router, prefix="/api")
app.include_router(catalogos.router, prefix="/api")
app.include_router(tutorias.router, prefix="/api")


if DEV_MODE:
    from .routes import dev
    app.include_router(dev.router, prefix="/api")