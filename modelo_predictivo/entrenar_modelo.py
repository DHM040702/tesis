import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    confusion_matrix,
    classification_report,
    roc_auc_score,
)
from xgboost import XGBClassifier
import joblib
import matplotlib.pyplot as plt

# ---------------------------------------------------------------------
# 1. CARGA DEL DATASET
# ---------------------------------------------------------------------
# Este CSV debe tener columnas:
# id_estudiante, id_periodo, promedio, asistencia, deserta, fse_puntos, fse_clase
# Ejemplo de fila:
# 20,7,4.333333,21.7,1,166,C

DATA_PATH = "dataset_desercion.csv"  # ajusta si tiene otro nombre

print("Cargando dataset desde:", DATA_PATH)
df = pd.read_csv(DATA_PATH)

print("\nPrimeras filas del dataset:")
print(df.head())

print("\nInformación general del dataset:")
print(df.info())

print("\nDescripción estadística numérica:")
print(df.describe())

print("\nDistribución de la variable deserta (0 = no deserta, 1 = deserta):")
print(df["deserta"].value_counts())


# ---------------------------------------------------------------------
# 2. PREPARACIÓN DE VARIABLES (INCLUYENDO FSE)
# ---------------------------------------------------------------------
# Tenemos:
#   - fse_puntos : puntaje numérico FSE (ej. 166)
#   - fse_clase  : categórica A/B/C
#     A = no pobre
#     B = pobre
#     C = extrema pobreza
#
# Vamos a crear una variable ordinal:
#   A -> 0, B -> 1, C -> 2
# que represente el nivel de vulnerabilidad socioeconómica.

mapa_fse = {"A": 0, "B": 1, "C": 2}
df["fse_clase_num"] = df["fse_clase"].map(mapa_fse)

# Por si hay valores inesperados en fse_clase (distintos de A/B/C)
valores_invalidos = df["fse_clase"].dropna()[~df["fse_clase"].isin(mapa_fse.keys())]
if not valores_invalidos.empty:
    print("\n⚠ Se encontraron valores de fse_clase fuera de A/B/C:")
    print(valores_invalidos.value_counts())
    print("   Estas filas serán eliminadas del dataset.")
    df = df[df["fse_clase"].isin(mapa_fse.keys())]

# Asegurarnos de que las columnas numéricas sean realmente numéricas
cols_numericas = ["promedio", "asistencia", "deserta", "fse_puntos", "fse_clase_num"]
for col in cols_numericas:
    df[col] = pd.to_numeric(df[col], errors="coerce")

# Eliminar filas con datos faltantes en las columnas clave
antes = len(df)
df = df.dropna(subset=cols_numericas)
despues = len(df)
if despues < antes:
    print(f"\nSe eliminaron {antes - despues} filas con datos faltantes en columnas clave.")

# Asegurar que deserta sea entero 0/1
df["deserta"] = df["deserta"].astype(int)

print("\nTamaño final del dataset después de limpieza:", len(df))


# ---------------------------------------------------------------------
# 3. DEFINICIÓN DE VARIABLES DE ENTRADA (X) Y OBJETIVO (y)
# ---------------------------------------------------------------------
# Variables de entrada para el modelo (features):
#   - promedio
#   - asistencia
#   - fse_puntos
#   - fse_clase_num (0,1,2)
#
# Variable objetivo:
#   - deserta (0 = no deserta, 1 = deserta)

X = df[["promedio", "asistencia", "fse_puntos", "fse_clase_num"]]
y = df["deserta"]

print("\nEjemplo de X (features):")
print(X.head())
print("\nEjemplo de y (target):")
print(y.head())


# ---------------------------------------------------------------------
# 4. DIVISIÓN TRAIN/TEST
# ---------------------------------------------------------------------
# Usamos 80% de los datos para entrenar (train) y 20% para evaluar (test).
# stratify=y asegura que la proporción de deserción se mantenga en ambos conjuntos.

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y,
)

print("\nTamaño X_train:", len(X_train))
print("Tamaño X_test: ", len(X_test))


# ---------------------------------------------------------------------
# 5. DEFINICIÓN DEL MODELO XGBOOST
# ---------------------------------------------------------------------
# XGBClassifier es un modelo de boosting basado en árboles de decisión.
# Parámetros escogidos:
#   - n_estimators: número de árboles.
#   - learning_rate: qué tanto aporta cada árbol nuevo.
#   - max_depth: profundidad máxima de los árboles (complejidad).
#   - subsample: fracción de ejemplos usados por cada árbol (regularización).
#   - colsample_bytree: fracción de variables usadas por cada árbol.
#   - eval_metric: métrica interna (logloss = logaritmo de pérdida).

model = XGBClassifier(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=5,
    subsample=0.8,
    colsample_bytree=0.8,
    eval_metric="logloss",
)

print("\nEntrenando modelo XGBoost...")
model.fit(X_train, y_train)
print("Entrenamiento completado.")


# ---------------------------------------------------------------------
# 6. PREDICCIONES SOBRE EL CONJUNTO DE PRUEBA
# ---------------------------------------------------------------------
# y_pred: etiqueta final (0/1) predicha por el modelo.
# y_prob: probabilidad de pertenecer a la clase 1 (deserta).

y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)[:, 1]


# ---------------------------------------------------------------------
# 7. EVALUACIÓN DEL MODELO
# ---------------------------------------------------------------------
# 7.1 Matriz de confusión: qué tanto se equivoca en cada clase.
# 7.2 Reporte de clasificación: precision, recall, f1-score.
# 7.3 AUC-ROC: qué tan bien separa desertores vs no desertores en términos de probabilidad.

from sklearn.metrics import ConfusionMatrixDisplay

cm = confusion_matrix(y_test, y_pred)
print("\nMatriz de confusión:")
print(cm)

print("\nReporte de clasificación:")
print(classification_report(y_test, y_pred))

auc = roc_auc_score(y_test, y_prob)
print(f"AUC-ROC: {auc:.4f}")

# (Opcional) Mostrar visualmente la matriz de confusión
disp = ConfusionMatrixDisplay(confusion_matrix=cm)
disp.plot()
plt.title("Matriz de Confusión - Modelo Deserción")
plt.show()


# ---------------------------------------------------------------------
# 8. IMPORTANCIA DE VARIABLES
# ---------------------------------------------------------------------
# Esto nos dice qué variables influyen más en las decisiones del modelo.

importances = model.feature_importances_
features = X.columns

print("\nImportancia de variables:")
for feat, imp in zip(features, importances):
    print(f"  {feat}: {imp:.4f}")

plt.figure()
plt.barh(features, importances)
plt.title("Importancia de Variables - Modelo XGBoost")
plt.xlabel("Importancia relativa")
plt.ylabel("Variable")
plt.tight_layout()
plt.show()


# ---------------------------------------------------------------------
# 9. GUARDAR MODELO ENTRENADO
# ---------------------------------------------------------------------
# Guardamos el modelo en un archivo .pkl para poder cargarlo luego
# desde FastAPI u otros scripts sin volver a entrenar.

OUTPUT_MODEL_PATH = "modelo_desercion_fse.pkl"
joblib.dump(model, OUTPUT_MODEL_PATH)
print(f"\n✅ Modelo guardado como: {OUTPUT_MODEL_PATH}")
