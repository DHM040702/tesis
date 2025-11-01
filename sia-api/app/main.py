# app/main.py
from fastapi import FastAPI
from .routes import auth, usuarios, estudiantes, riesgo, alertas, fse, dev,academico, catalogos, tutorias
import os
from fastapi.middleware.cors import CORSMiddleware

DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"


def _cors_config() -> dict:
    raw_origins = os.getenv("CORS_ORIGINS", "")
    origin_regex = os.getenv("CORS_ORIGIN_REGEX", "").strip()

    origins: list[str]
    if raw_origins.strip():
        origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    else:
        origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        ]

        if not origin_regex:
            # Permit orígenes de redes privadas típicas (192.168.x.x, 10.x.x.x, 172.16-31) cuando
            # se desarrolla desde otro dispositivo dentro de la misma red local.
            origin_regex = (
                r"http://(localhost|127\.0\.0\.1|0\.0\.0\.0|"
                r"192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
                r"172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?"
            )

    config: dict = {
        "allow_origins": origins,
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
    }
    if origin_regex:
        config["allow_origin_regex"] = origin_regex
    return config


app = FastAPI(title="SIA-UNASAM API (FastAPI)", version="1.0")

app.add_middleware(
    CORSMiddleware,
    **_cors_config(),
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