# app/seed_admin.py
import asyncio, os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from dotenv import load_dotenv
from .db import SessionLocal
from .security import hash_password

load_dotenv()

ADMIN_CORREO = os.getenv("ADMIN_CORREO","admin@unasam.edu.pe")
ADMIN_PASS   = os.getenv("ADMIN_PASS","Admin123*")
ADMIN_NOMBRE = os.getenv("ADMIN_NOMBRE","Administrador SIA-UNASAM")
ADMIN_DNI    = os.getenv("ADMIN_DNI","99999999")

# Para partir el nombre visible en apellidos/nombres del admin seed (ajústalo si quieres)
ADMIN_AP = os.getenv("ADMIN_APELLIDO_PATERNO","ADMIN")
ADMIN_AM = os.getenv("ADMIN_APELLIDO_MATERNO","SISTEMA")
ADMIN_NO = os.getenv("ADMIN_NOMBRES","SIA UNASAM")

async def main():
    async with SessionLocal() as s:  # type: AsyncSession
        # estados y rol base
        await s.execute(text("""
            INSERT IGNORE INTO estados_usuario (id_estado_usuario, nombre) VALUES (1,'activo'),(2,'bloqueado')
        """))
        await s.execute(text("""
            INSERT IGNORE INTO roles (nombre, descripcion) VALUES ('admin','Administrador del sistema')
        """))

        # upsert persona admin
        await s.execute(text("""
            INSERT INTO personas (dni, apellido_paterno, apellido_materno, nombres)
            VALUES (:dni, :ap, :am, :nom)
            ON DUPLICATE KEY UPDATE
              apellido_paterno=VALUES(apellido_paterno),
              apellido_materno=VALUES(apellido_materno),
              nombres=VALUES(nombres)
        """), {"dni": ADMIN_DNI, "ap": ADMIN_AP, "am": ADMIN_AM, "nom": ADMIN_NO})

        pid_row = (await s.execute(text("SELECT id_persona FROM personas WHERE dni=:d"), {"d": ADMIN_DNI})).fetchone()
        pid = int(pid_row.id_persona)

        # crear usuario si no existe
        res = await s.execute(text("SELECT id_usuario FROM usuarios WHERE correo=:c"), {"c": ADMIN_CORREO})
        row = res.fetchone()
        if not row:
            hashed = hash_password(ADMIN_PASS)
            await s.execute(text("""
                INSERT INTO usuarios(id_persona, correo, contrasenia_hash, id_estado_usuario)
                VALUES (:pid, :c, :h, 1)
            """), {"pid": pid, "c": ADMIN_CORREO, "h": hashed})
            await s.commit()

        # asignar rol admin
        await s.execute(text("""
          INSERT INTO usuarios_roles (id_usuario, id_rol)
          SELECT u.id_usuario, r.id_rol FROM usuarios u, roles r
          WHERE u.correo=:c AND r.nombre='admin'
          ON DUPLICATE KEY UPDATE id_rol = r.id_rol
        """), {"c": ADMIN_CORREO})
        await s.commit()
        print("Admin listo:", ADMIN_CORREO, "DNI:", ADMIN_DNI)

if __name__ == "__main__":
    asyncio.run(main())