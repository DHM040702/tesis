import pymysql
import pandas as pd
from decimal import Decimal
import numpy as np

from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.metrics import confusion_matrix, classification_report, roc_auc_score
from xgboost import XGBClassifier
import joblib
import matplotlib.pyplot as plt

# -------------------------------------------------------
# 1. Cargar datos desde MySQL
# -------------------------------------------------------

QUERY = """
SELECT
    id_estudiante,
    id_periodo,
    promedio,
    asistencia,
    cursos_matriculados,
    cursos_desaprobados,
    deserta
FROM v_dataset_desercion_simple;
"""

print("Conectando a MySQL...")
conn = pymysql.connect(
    host="localhost",
    user="root",
    password="root",
    database="sia_unasam",
    cursorclass=pymysql.cursors.DictCursor
)

with conn:
    cur = conn.cursor()
    cur.execute(QUERY)
    rows = cur.fetchall()

print("Filas obtenidas:", len(rows))

def conv(x):
    return float(x) if isinstance(x, Decimal) else x

rows = [{k: conv(v) for k, v in r.items()} for r in rows]
df = pd.DataFrame(rows)

print("\nPrimeras filas:")
print(df.head())

print("\nDistribución de 'deserta':")
print(df["deserta"].value_counts())

# -------------------------------------------------------
# 2. Limpiar y asegurar tipos
# -------------------------------------------------------

num_cols = [
    "id_estudiante","id_periodo",
    "promedio","asistencia",
    "cursos_matriculados","cursos_desaprobados",
    "deserta"
]
for col in num_cols:
    df[col] = pd.to_numeric(df[col], errors="coerce")

df = df.dropna(subset=["promedio","asistencia","cursos_matriculados",
                       "cursos_desaprobados","deserta"])
df["deserta"] = df["deserta"].astype(int)

print("\nDescripción estadística:")
print(df.describe())

# -------------------------------------------------------
# 3. Ingeniería de características (solo con datos reales)
# -------------------------------------------------------

df["carga_baja"] = (df["cursos_matriculados"] <= 2).astype(int)
df["cursos_aprobados"] = df["cursos_matriculados"] - df["cursos_desaprobados"]

df["tasa_desaprob"] = df["cursos_desaprobados"] / df["cursos_matriculados"].replace(0,1)
df["tasa_desaprob"] = df["tasa_desaprob"].clip(0,1)  # por seguridad

df["sin_desaprob"] = (df["cursos_desaprobados"] == 0).astype(int)

df["rendimiento_global"] = df["promedio"] * (df["asistencia"] / 100.0)
df["carga_x_rend"] = df["cursos_matriculados"] * df["promedio"]

# -------------------------------------------------------
# 4. Definir X e y
# -------------------------------------------------------

features = [
    "promedio",
    "asistencia",
    "cursos_matriculados",
    "cursos_desaprobados",
    "carga_baja",
    "cursos_aprobados",
    "tasa_desaprob",
    "sin_desaprob",
    "rendimiento_global",
    "carga_x_rend",
]

X = df[features]
y = df["deserta"]

print("\nTamaño X:", X.shape, " y:", y.shape)

# -------------------------------------------------------
# 5. Train/Test split (sin SMOTE)
# -------------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print("\nClases en train:")
print(y_train.value_counts())
print("\nClases en test:")
print(y_test.value_counts())

# scale_pos_weight = #negativos / #positivos
num_neg = (y_train == 0).sum()
num_pos = (y_train == 1).sum()
scale_pos_weight = num_neg / num_pos
print(f"\nscale_pos_weight calculado: {scale_pos_weight:.3f}")

# -------------------------------------------------------
# 6. Búsqueda aleatoria de hiperparámetros
# -------------------------------------------------------

base_model = XGBClassifier(
    eval_metric="logloss",
    use_label_encoder=False,
    n_jobs=-1,
    scale_pos_weight=scale_pos_weight
)

param_dist = {
    "n_estimators":     [200, 300, 400, 500],
    "learning_rate":    [0.01, 0.03, 0.05, 0.1],
    "max_depth":        [3, 4, 5, 6, 7],
    "subsample":        [0.7, 0.8, 0.9, 1.0],
    "colsample_bytree": [0.7, 0.8, 0.9, 1.0],
    "gamma":            [0, 0.1, 0.3],
    "reg_alpha":        [0, 0.1, 0.5],
    "reg_lambda":       [1, 1.5, 2],
}

print("\nIniciando búsqueda de hiperparámetros (RandomizedSearchCV)...")
search = RandomizedSearchCV(
    estimator=base_model,
    param_distributions=param_dist,
    n_iter=30,
    scoring="roc_auc",
    cv=3,
    verbose=1,
    random_state=42,
    n_jobs=-1
)

search.fit(X_train, y_train)

print("\nMejores hiperparámetros encontrados:")
print(search.best_params_)
print("Mejor AUC-ROC (CV):", search.best_score_)

best_model = search.best_estimator_

# -------------------------------------------------------
# 7. Evaluación final en test
# -------------------------------------------------------

y_pred = best_model.predict(X_test)
y_prob = best_model.predict_proba(X_test)[:,1]

print("\nMatriz de confusión (test):")
print(confusion_matrix(y_test, y_pred))

print("\nReporte de clasificación (test):")
print(classification_report(y_test, y_pred))

auc_test = roc_auc_score(y_test, y_prob)
print("\nAUC-ROC en test:", auc_test)

# -------------------------------------------------------
# 8. Importancia de variables
# -------------------------------------------------------

importances = best_model.feature_importances_

plt.figure(figsize=(7,5))
plt.barh(features, importances)
plt.title("Importancia de características - Modelo Optimizado")
plt.tight_layout()
plt.show()

for feat, imp in sorted(zip(features, importances), key=lambda x: -x[1]):
    print(f"{feat}: {imp:.4f}")

# -------------------------------------------------------
# 9. Guardar modelo
# -------------------------------------------------------

joblib.dump(best_model, "modelo_desercion_optimizado.pkl")
print("\n✔ Modelo guardado como modelo_desercion_optimizado.pkl")
