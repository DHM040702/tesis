import os
import pandas as pd
import pymysql
from dotenv import load_dotenv

load_dotenv()

# Conexión a BD
conn = pymysql.connect(
    host=os.getenv("MYSQL_HOST", "127.0.0.1"),
    user=os.getenv("MYSQL_USER", "root"),
    password=os.getenv("MYSQL_PASS", "root"),
    database=os.getenv("MYSQL_DB", "sia_unasam"),
    cursorclass=pymysql.cursors.DictCursor
)

query = """
SELECT * FROM vw_dataset_modelo_notas
ORDER BY codigo_alumno, periodo;
"""

df = pd.read_sql(query, conn)
conn.close()

print("Dataset cargado:", df.shape)
print(df.head())

# Exportar CSV (opcional)
df.to_csv("dataset_modelo_notas.csv", index=False, encoding="utf-8")
