# modelo_predictivo/integracion_fastapi.py (snippet para tu router riesgo.py)
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
import joblib
import numpy as np
from ..deps import require_roles

router = APIRouter(prefix="/riesgo", tags=["riesgo"])

MODEL_PATH = "modelo_predictivo/out/modelo_riesgo.joblib"
_features = ["promedio", "asistencia", "fse_puntos", "sesiones_tutoria", "riesgo_prev"]
model = joblib.load(MODEL_PATH)

class DatosPredictivos(BaseModel):
    promedio: float = Field(..., ge=0)
    asistencia: float = Field(..., ge=0)
    fse_puntos: float = Field(..., ge=0)
    sesiones_tutoria: int = Field(..., ge=0)
    riesgo_prev: float = Field(..., ge=0)

@router.post("/predict", dependencies=[Depends(require_roles("admin","autoridad","tutor"))])
def predecir_riesgo(data: DatosPredictivos):
    x = np.array([[data.promedio, data.asistencia, data.fse_puntos, data.sesiones_tutoria, data.riesgo_prev]])
    try:
        pred = int(model.predict(x)[0])
    except Exception as e:
        raise HTTPException(400, f"No se pudo predecir: {e}")
    niveles = {1: "ALTO", 2: "MEDIO", 3: "BAJO"}
    return {"ok": True, "codigo": pred, "nivel_predicho": niveles.get(pred, "DESCONOCIDO")}
