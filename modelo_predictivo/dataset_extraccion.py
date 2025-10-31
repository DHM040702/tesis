# modelo_predictivo/dataset_extraccion.py
import os
import pandas as pd
import pymysql

DB_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:root@localhost:3306/sia_unasam")

def _parse_db_url(url: str):
    # mysql+pymysql://user:pass@host:port/db
    assert url.startswith("mysql+pymysql://")
    core = url[len("mysql+pymysql://"):]
    user_pass, host_db = core.split("@", 1)
    user, password = user_pass.split(":", 1)
    host_port, db = host_db.split("/", 1)
    if ":" in host_port:
        host, port = host_port.split(":")
        port = int(port)
    else:
        host, port = host_port, 3306
    return dict(user=user, password=password, host=host, port=port, db=db)

def main():
    cfg = _parse_db_url(DB_URL)
    conn = pymysql.connect(
        host=cfg["host"],
        port=cfg["port"],
        user=cfg["user"],
        password=cfg["password"],
        database=cfg["db"],
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )

    sql = "SELECT * FROM vw_dataset_modelo"
    df = pd.read_sql(sql, conn)

    print("Filas:", len(df), "Columnas:", len(df.columns))
    print("Nulos por columna:\n", df.isna().sum())

    os.makedirs("modelo_predictivo/out", exist_ok=True)
    out = "modelo_predictivo/out/dataset_modelo.csv"
    df.to_csv(out, index=False)
    print(f"Dataset guardado en: {out}")

if __name__ == "__main__":
    main()
