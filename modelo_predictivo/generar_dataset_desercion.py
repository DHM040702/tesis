import os
import pandas as pd
import pymysql
from decimal import Decimal
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
DB_NAME = os.getenv("DB_NAME", "sia_unasam")

QUERY = """
SELECT 
    e.id_estudiante,
    m.id_periodo,
    COALESCE(vp.promedio, 0)        AS promedio,
    COALESCE(va.asistencia_pct, 0)  AS asistencia,
    vd.deserta                      AS deserta,
    vf.fse_puntos,
    vf.fse_clase
FROM estudiantes e
JOIN matriculas m 
      ON m.id_estudiante = e.id_estudiante
LEFT JOIN v_promedio_periodo vp 
      ON vp.id_estudiante = e.id_estudiante 
     AND vp.id_periodo    = m.id_periodo
LEFT JOIN v_asistencia_periodo va 
      ON va.id_estudiante = e.id_estudiante
     AND va.id_periodo    = m.id_periodo
LEFT JOIN v_desercion_academica vd
      ON vd.id_estudiante = e.id_estudiante
     AND vd.id_periodo    = m.id_periodo
LEFT JOIN v_fse_estudiante_periodo vf
      ON vf.id_estudiante = e.id_estudiante
     AND vf.id_periodo    = m.id_periodo
where
	vf.fse_puntos is not null
    AND vf.fse_clase is not null;
"""

def main():
    print("Conectando a la base de datos...")
    conn = pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,  # 👉 filas como diccionarios
    )

    try:
        with conn.cursor() as cur:
            # Solo para confirmar
            cur.execute("SELECT DATABASE()")
            print("Base de datos actual:", cur.fetchone())

            print("\nEjecutando consulta completa para generar dataset...")
            cur.execute(QUERY)
            rows = cur.fetchall()
            print(f"Filas obtenidas: {len(rows)}")

        if not rows:
            print("❌ No se obtuvieron filas. Revisa la consulta o la BD.")
            return

        # Convertir Decimals a float y armar el DataFrame
        def conv(x):
            return float(x) if isinstance(x, Decimal) else x

        rows_conv = [
            {k: conv(v) for k, v in row.items()}
            for row in rows
        ]

        df = pd.DataFrame(rows_conv)

        print("\nPrimeras filas del dataset crudo:")
        print(df.head())

        print("\nTipos de datos iniciales:")
        print(df.dtypes)

        # Asegurar tipos numéricos
        num_cols = ["id_estudiante", "id_periodo", "promedio", "asistencia", "deserta"]
        for col in num_cols:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        # Eliminar filas con deserta nulo
        antes = len(df)
        df = df.dropna(subset=["deserta"])
        despues = len(df)
        if despues < antes:
            print(f"\nSe eliminaron {antes - despues} filas sin etiqueta de deserción.")

        if df.empty:
            print("\n❌ Después de limpiar, el dataset quedó vacío.")
            return

        df["deserta"] = df["deserta"].astype(int)

        print("\nDistribución de la variable deserta:")
        print(df["deserta"].value_counts())

        output_path = "dataset_desercion.csv"
        df.to_csv(output_path, index=False, encoding="utf-8-sig")
        print(f"\n✅ Dataset guardado en: {output_path}")

    finally:
        conn.close()
        print("\nConexión cerrada.")

if __name__ == "__main__":
    main()
