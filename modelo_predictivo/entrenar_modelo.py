# modelo_predictivo/entrenar_modelo.py
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
import joblib

OUT_DIR = "modelo_predictivo/out"

def main():
    X_train = pd.read_csv(f"{OUT_DIR}/X_train.csv")
    X_test  = pd.read_csv(f"{OUT_DIR}/X_test.csv")
    y_train = pd.read_csv(f"{OUT_DIR}/y_train.csv").iloc[:,0]
    y_test  = pd.read_csv(f"{OUT_DIR}/y_test.csv").iloc[:,0]

    model = RandomForestClassifier(n_estimators=200, random_state=42, class_weight="balanced")
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    print(classification_report(y_test, y_pred))
    print(confusion_matrix(y_test, y_pred))

    joblib.dump(model, f"{OUT_DIR}/modelo_riesgo.joblib")
    print("Modelo guardado en:", f"{OUT_DIR}/modelo_riesgo.joblib")

if __name__ == "__main__":
    main()
