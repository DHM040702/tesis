# modelo_predictivo/limpieza_preparacion.py
import os
import pandas as pd
from sklearn.model_selection import train_test_split

IN_CSV  = "modelo_predictivo/out/dataset_modelo.csv"
OUT_DIR = "modelo_predictivo/out"

FEATURES = ["promedio", "asistencia", "fse_puntos", "sesiones_tutoria", "riesgo_prev"]
TARGET   = "nivel_actual"   # etiqueta multiclase 1/2/3

def main():
    df = pd.read_csv(IN_CSV)

    # Limpieza básica
    df[FEATURES] = df[FEATURES].fillna(0)
    df[TARGET]   = df[TARGET].fillna(0).astype(int)

    # Para investigación: filtra registros sin etiqueta si los hubiera
    df = df[df[TARGET].isin([1, 2, 3])].copy()

    X = df[FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y if y.nunique()>1 else None
    )

    os.makedirs(OUT_DIR, exist_ok=True)
    X_train.to_csv(f"{OUT_DIR}/X_train.csv", index=False)
    X_test.to_csv(f"{OUT_DIR}/X_test.csv", index=False)
    y_train.to_csv(f"{OUT_DIR}/y_train.csv", index=False)
    y_test.to_csv(f"{OUT_DIR}/y_test.csv", index=False)

    # Guarda metadatos de columnas
    with open(f"{OUT_DIR}/columns.txt", "w", encoding="utf-8") as f:
        f.write("FEATURES=" + ",".join(FEATURES) + "\n")
        f.write("TARGET=" + TARGET + "\n")

    print("Split listo en modelo_predictivo/out/")

if __name__ == "__main__":
    main()
