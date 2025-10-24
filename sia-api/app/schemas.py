# app/schemas.py
from pydantic import BaseModel, EmailStr
from typing import Optional, Any

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
