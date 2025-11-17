from fastapi import APIRouter
import joblib
import numpy as np

router = APIRouter()

# Cargar el modelo cuando se levanta el servidor
modelo = joblib.load("modelo_desercion_fse.pkl")

@router.post("/riesgo/prediccion")
def predecir_riesgo(promedio: float, asistencia: float, fse_puntos: float, fse_clase: str):
    
    # Convertir fse_clase A/B/C → 0/1/2
    mapa_fse = {"A": 0, "B": 1, "C": 2}
    fse_clase_num = mapa_fse.get(fse_clase.upper(), None)

    if fse_clase_num is None:
        return {"error": "fse_clase debe ser A, B o C"}

    # Formar vector para el modelo
    X = np.array([[promedio, asistencia, fse_puntos, fse_clase_num]])

    # Predicciones
    pred = modelo.predict(X)[0]
    prob = float(modelo.predict_proba(X)[0][1])  # convertir np.float a float normal

    # Opcional: calcular nivel de riesgo
    if prob >= 0.7:
        nivel = "ALTO"
    elif prob >= 0.4:
        nivel = "MEDIO"
    else:
        nivel = "BAJO"

    return {
        "promedio": promedio,
        "asistencia": asistencia,
        "fse_puntos": fse_puntos,
        "fse_clase": fse_clase,
        "prediccion_deserta": int(pred),
        "probabilidad": prob,
        "nivel_riesgo": nivel
    }
