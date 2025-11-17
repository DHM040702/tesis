import joblib
import numpy as np

# Cargar modelo
model = joblib.load("modelo_desercion_optimizado.pkl")

def predecir_desercion(promedio, asistencia, cursos_matriculados, cursos_desaprobados):
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

    prob = model.predict_proba(X_nuevo)[0,1]
    pred = int(prob >= 0.7)

    if prob >= 0.7:
        nivel = "ALTO"
    elif prob >= 0.4:
        nivel = "MEDIO"
    else:
        nivel = "BAJO"

    return pred, prob, nivel

# Ejemplo malo
pred, prob, nivel = predecir_desercion(promedio=5, asistencia=5,
                                       cursos_matriculados=6, cursos_desaprobados=6)
print("Caso MUY malo → pred:", pred, "prob:", prob, "nivel:", nivel)

# Ejemplo bueno
pred2, prob2, nivel2 = predecir_desercion(promedio=18, asistencia=90,
                                          cursos_matriculados=6, cursos_desaprobados=0)
print("Caso MUY bueno → pred:", pred2, "prob:", prob2, "nivel:", nivel2)
