from fastapi import APIRouter, Depends, HTTPException
from pathlib import Path
import joblib
import numpy as np

from ..deps import require_roles
from ..schemas import ApiResponse, DesercionRequest, DesercionResponse

router = APIRouter(prefix="/modelo", tags=["modelos"])

# === CARGA DEL MODELO ===
MODEL_PATH = (
    Path(__file__).resolve().parent.parent
    / "modelos"
    / "modelo_desercion_optimizado.pkl"
)

try:
    model_desercion = joblib.load(MODEL_PATH)
    print("[OK] Modelo de deserción cargado correctamente")
except Exception as exc:
    print(f"[WARN] No se pudo cargar el modelo de deserción: {exc}")
    model_desercion = None


def _predecir_desercion(
    promedio: float,
    asistencia: float,
    cursos_matriculados: int,
    cursos_desaprobados: int,
):
    """
    Misma lógica que tu script standalone.
    """
    carga_baja = 1 if cursos_matriculados <= 2 else 0
    cursos_aprobados = cursos_matriculados - cursos_desaprobados

    tasa_desaprob = cursos_desaprobados / (cursos_matriculados if cursos_matriculados > 0 else 1)
    tasa_desaprob = max(0, min(1, tasa_desaprob))

    sin_desaprob = 1 if cursos_desaprobados == 0 else 0
    rendimiento_global = promedio * (asistencia / 100.0)
    carga_x_rend = cursos_matriculados * promedio

    X_nuevo = np.array([[
        promedio,
        asistencia,
        cursos_matriculados,
        cursos_desaprobados,
        carga_baja,
        cursos_aprobados,
        tasa_desaprob,
        sin_desaprob,
        rendimiento_global,
        carga_x_rend,
    ]])

    prob = float(model_desercion.predict_proba(X_nuevo)[0, 1])
    pred = int(prob >= 0.7)

    if prob >= 0.7:
        nivel = "ALTO"
    elif prob >= 0.4:
        nivel = "MEDIO"
    else:
        nivel = "BAJO"

    return pred, prob, nivel

@router.post(
    "/modelo-desercion",
    response_model=ApiResponse,  # o ApiResponse[DesercionResponse] si usas genéricos
    dependencies=[Depends(require_roles("admin", "autoridad", "tutor"))],
)
async def predecir_desercion_endpoint(payload: DesercionRequest):
    """
    Endpoint que envuelve la función de predicción del modelo de deserción.
    Recibe:
    - promedio
    - asistencia
    - cursos_matriculados
    - cursos_desaprobados
    """

    if model_desercion is None:
        raise HTTPException(
            status_code=500,
            detail="El modelo de deserción no está disponible en el servidor.",
        )

    pred, prob, nivel = _predecir_desercion(
        promedio=payload.promedio,
        asistencia=payload.asistencia,
        cursos_matriculados=payload.cursos_matriculados,
        cursos_desaprobados=payload.cursos_desaprobados,
    )

    data = DesercionResponse(
        prediccion=pred,
        probabilidad=prob,
        nivel=nivel,
    )

    return {
        "ok": True,
        "data": data.model_dump(),
        "message": None,
    }
