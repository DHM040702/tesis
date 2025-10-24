# app/deps.py
"""
Dependencias comunes para FastAPI:
- get_current_user: exige JWT válido y expone la identidad normalizada
- require_roles(...): fábrica de dependencias para autorización por rol
"""

from __future__ import annotations
from typing import Any, Dict, Iterable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .security import decode_token, extract_user_identity

# Autenticación tipo Bearer (Authorization: Bearer <token>)
bearer = HTTPBearer(auto_error=True)


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
) -> Dict[str, Any]:
    """
    Valida el JWT recibido por encabezado Authorization.
    Devuelve un dict con { id_usuario, email, roles } si es válido.
    Lanza 401 si el token es inválido o expiró.
    """
    token = creds.credentials
    payload = decode_token(token)
    if not payload:
        # Token inválido, expirado o de tipo distinto a "access"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )
    return extract_user_identity(payload)


def require_roles(*roles_permitidos: str):
    """
    Fábrica de dependencias para autorización por roles.
    Uso:
        @router.get("/ruta", dependencies=[Depends(require_roles("admin","autoridad"))])
    Acepta el request solo si el usuario tiene al menos uno de los roles permitidos.
    """
    roles_permitidos = set(r.lower() for r in roles_permitidos)

    async def _checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        roles = [str(r).lower() for r in (user.get("roles") or [])]
        if not any(r in roles_permitidos for r in roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permisos insuficientes para acceder a este recurso",
            )
        return user  # se reexpone para que el endpoint lo pueda usar si quiere

    return _checker
