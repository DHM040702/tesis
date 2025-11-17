# app/schemas.py
from pydantic import BaseModel, EmailStr
from typing import Optional, Any

from pydantic import BaseModel

class DesercionRequest(BaseModel):
    promedio: float
    asistencia: float
    cursos_matriculados: int
    cursos_desaprobados: int


class DesercionResponse(BaseModel):
    prediccion: int             # 0 = no deserter, 1 = deserter
    probabilidad: float         # probabilidad de deserción (0–1)
    nivel: str                  # "BAJO", "MEDIO", "ALTO"

class LoginIn(BaseModel):
    correo: EmailStr
    contrasenia: str

class TokenOut(BaseModel):
    ok: bool = True
    token: str

class PerfilOut(BaseModel):
    id_usuario: int
    correo: EmailStr
    nombre_completo: str
    estado: str
    roles: list[str]

class ApiResponse(BaseModel):
    ok: bool = True
    data: Any | None = None
    message: Optional[str] = None
