# app/security.py
from __future__ import annotations
import os, re, hashlib, secrets, uuid
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.hash import pbkdf2_sha256  # elegimos PBKDF2 para evitar backends nativas

# ==========================
# CONFIG
# ==========================
JWT_SECRET = os.getenv("JWT_SECRET", "clave_secreta_dev")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRES_MIN = int(os.getenv("JWT_EXPIRES_MIN", "720"))  # access token

# Refresh tokens (JWT + registro en BD)
REFRESH_EXPIRES_DAYS = int(os.getenv("REFRESH_EXPIRES_DAYS", "30"))

# ==========================
# POLÍTICA DE CONTRASEÑAS
# ==========================
STRONG_RE = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,256}$"
)
def password_is_strong(pw: str) -> bool:
    return bool(STRONG_RE.match(pw or ""))
def password_strength_hint() -> str:
    return ("La contraseña debe tener 8–256 caracteres e incluir mayúsculas, "
            "minúsculas, un número y un símbolo.")

# ==========================
# HASH & VERIFY (PBKDF2)
# ==========================
def hash_password(plain_password: str) -> str:
    return pbkdf2_sha256.hash(plain_password)
def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return pbkdf2_sha256.verify(plain_password, password_hash)
    except Exception:
        return False

# ==========================
# JWT: ACCESS
# ==========================
def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def create_access_token(user_id: int, email: str, roles: list[str], expires_minutes: int | None = None) -> str:
    expire = now_utc() + timedelta(minutes=expires_minutes or JWT_EXPIRES_MIN)
    payload = {
        "sub": str(user_id),
        "email": email,
        "roles": roles,
        "type": "access",
        "iat": int(now_utc().timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None

def extract_user_identity(payload: dict) -> dict:
    return {
        "id_usuario": int(payload.get("sub")),
        "email": payload.get("email"),
        "roles": payload.get("roles", []),
    }

# ==========================
# JWT: REFRESH (con registro en BD)
# ==========================
def generate_jti() -> str:
    return str(uuid.uuid4())

def create_refresh_token(user_id: int, jti: str | None = None, expires_days: int | None = None) -> str:
    """
    Crea un refresh token JWT (type=refresh) con un JTI único.
    Se recomienda almacenar su SHA-256 en BD y NO el token en claro.
    """
    jti = jti or generate_jti()
    expire = now_utc() + timedelta(days=expires_days or REFRESH_EXPIRES_DAYS)
    payload = {
        "sub": str(user_id),
        "jti": jti,
        "type": "refresh",
        "iat": int(now_utc().timestamp()),
        "exp": int(expire.timestamp()),
        # 'rnd' agrega entropía extra (evita tokens idénticos si se llama en el mismo segundo)
        "rnd": secrets.token_hex(8),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_refresh_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError:
        return None

def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

"""
    {
  "correo": "diego@unasam.com",
  "contrasenia": "Diego04@",
  "estado": "activo",
  "roles": ["admin"],
  "persona": {
    "dni": "72279092",
    "apellido_paterno": "Huaman",
    "apellido_materno": "Moreno",
    "nombres": "Diego Sebastian",
    "id_genero": 1,
    "fecha_nacimiento": "2002-07-04"
  }
}
"""