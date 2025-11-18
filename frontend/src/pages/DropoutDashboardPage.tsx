import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { DropoutPredictionRequest, DropoutPredictionResult, StudentAttendanceSummary, StudentItem } from "../types";

const MIN_SEARCH_LENGTH = 3;
const DEFAULT_MANUAL_VALUES: DropoutPredictionRequest = {
  promedio: 12,
  asistencia: 80,
  cursos_matriculados: 5,
  cursos_desaprobados: 0
};

export function DropoutDashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedTerm = useDebouncedValue(searchTerm, 400);
  const normalizedTerm = debouncedTerm.trim();
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  const [studentFeatures, setStudentFeatures] = useState<DropoutPredictionRequest | null>(null);
  const [studentPrediction, setStudentPrediction] = useState<DropoutPredictionResult | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  const [manualValues, setManualValues] = useState<DropoutPredictionRequest>(DEFAULT_MANUAL_VALUES);
  const [manualPrediction, setManualPrediction] = useState<DropoutPredictionResult | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const { data: periodos } = useQuery({
    queryKey: ["periodos"],
    queryFn: () => apiClient.getPeriodos()
  });

  const { data: searchResult, isFetching: isSearching } = useQuery({
    queryKey: ["student-search-code", normalizedTerm],
    enabled: normalizedTerm.length >= MIN_SEARCH_LENGTH,
    queryFn: () =>
      apiClient.searchStudentsByCode({
        codigo: normalizedTerm,
        max_alumnos: 10
      })
  });

  useEffect(() => {
    if (!selectedPeriod && periodos && periodos.length > 0) {
      setSelectedPeriod(String(periodos[0].id_periodo));
    }
  }, [periodos, selectedPeriod]);

  const studentOptions = useMemo(() => {
    const base = searchResult ?? [];
    if (!normalizedTerm) {
      return base;
    }
    const normalizedLower = normalizedTerm.toLowerCase();
    return base.filter((student) => {
      const dni = (student.dni ?? "").toLowerCase();
      const code = (student.codigo_alumno ?? "").toLowerCase();
      if (code.includes(normalizedLower)) {
        return true;
      }
      if (dni.includes(normalizedLower)) {
        return true;
      }
      const fullName = formatStudentName(student).toLowerCase();
      return fullName.includes(normalizedLower);
    });
  }, [normalizedTerm, searchResult]);
  const canPredictWithStudent = Boolean(selectedStudent && selectedPeriod);
  const selectedStudentLabel = useMemo(() => (selectedStudent ? formatStudentName(selectedStudent) : "Sin selección"), [selectedStudent]);

  const handleRunStudentPrediction = async () => {
    if (!selectedStudent || !selectedPeriod) {
      setStudentError("Seleccione un estudiante y un periodo académico.");
      return;
    }
    setStudentLoading(true);
    setStudentError(null);
    try {
      const periodId = Number(selectedPeriod);
      const [grades, attendance, matriculas] = await Promise.all([
        apiClient.getAcademicGrades({ id_estudiante: selectedStudent.id_estudiante, id_periodo: periodId }),
        apiClient.getAcademicAsistencias({ id_estudiante: selectedStudent.id_estudiante, id_periodo: periodId }).catch(() => []),
        apiClient.getAcademicMatriculas({ id_estudiante: selectedStudent.id_estudiante, id_periodo: periodId }).catch(() => [])
      ]);

      const promedio = typeof grades.promedio_general === "number" ? grades.promedio_general : 0;
      const cursosMatriculados = Math.max(grades.detalle.length, matriculas.length);
      const cursosDesaprobados = grades.detalle.reduce((acc, item) => {
        const estado = (item.estado ?? "").toLowerCase();
        if (estado.includes("desaprob") || (typeof item.nota_final === "number" && item.nota_final < 11)) {
          return acc + 1;
        }
        return acc;
      }, 0);
      const asistencia = computeAttendanceAverage(attendance);
      if (cursosMatriculados === 0 && promedio === 0) {
        throw new Error("No se encontraron registros académicos para el periodo seleccionado.");
      }
      const payload: DropoutPredictionRequest = {
        promedio: roundTo(promedio, 2),
        asistencia: roundTo(asistencia, 2),
        cursos_matriculados: cursosMatriculados || 1,
        cursos_desaprobados: Math.min(cursosDesaprobados, cursosMatriculados || 1)
      };
      const prediction = await apiClient.predictDropout(payload);
      setStudentFeatures(payload);
      setStudentPrediction(prediction);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo obtener la predicción.";
      setStudentError(message);
      setStudentFeatures(null);
      setStudentPrediction(null);
    } finally {
      setStudentLoading(false);
    }
  };

  const handleManualChange = (field: keyof DropoutPredictionRequest, value: number) => {
    setManualValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleManualSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setManualError(null);
    setManualLoading(true);
    try {
      const sanitized: DropoutPredictionRequest = {
        promedio: roundTo(manualValues.promedio, 2),
        asistencia: roundTo(clamp(manualValues.asistencia, 0, 100), 2),
        cursos_matriculados: Math.max(1, Math.round(manualValues.cursos_matriculados)),
        cursos_desaprobados: Math.min(
          Math.max(0, Math.round(manualValues.cursos_desaprobados)),
          Math.max(1, Math.round(manualValues.cursos_matriculados))
        )
      };
      const prediction = await apiClient.predictDropout(sanitized);
      setManualValues(sanitized);
      setManualPrediction(prediction);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo obtener la predicción.";
      setManualError(message);
      setManualPrediction(null);
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="page__header">
        <p className="page__eyebrow">Modelo predictivo</p>
        <h1 className="page__title">Predicción de deserción</h1>
        <p className="page__subtitle">Evalúe el riesgo con datos reales del estudiante o ingrese valores manualmente para realizar simulaciones.</p>
      </header>

      <section className="surface model-section">
        <header className="section-header">
          <div>
            <p className="section-header__eyebrow">Modo 1 · Datos institucionales</p>
            <h2 className="section-header__title">Utilizar un estudiante existente</h2>
            <p className="section-header__meta">
              Busque al estudiante, seleccione el periodo académico y consolidaremos promedio, asistencia y desempeño para alimentar el modelo.
            </p>
          </div>
          {selectedStudent && (
            <button type="button" className="button button--ghost" onClick={() => setSelectedStudent(null)}>
              Limpiar selección
            </button>
          )}
        </header>
        <div className="model-form__grid">
          <label className="field">
            <span className="field__label">Buscar estudiante</span>
            <input
              type="text"
              className="field__control"
              placeholder="Código de estudiante, DNI o nombre"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <span className="field__hint">Ingrese al menos {MIN_SEARCH_LENGTH} caracteres.</span>
          </label>
          <label className="field">
            <span className="field__label">Periodo académico</span>
            <select className="field__control" value={selectedPeriod} onChange={(event) => setSelectedPeriod(event.target.value)}>
              {periodos?.map((periodo) => (
                <option key={periodo.id_periodo} value={periodo.id_periodo}>
                  {periodo.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <StudentSearchList
          results={studentOptions}
          isSearching={isSearching}
          minCharsReached={normalizedTerm.length >= MIN_SEARCH_LENGTH}
          onSelect={(student) => setSelectedStudent(student)}
          selectedId={selectedStudent?.id_estudiante}
        />

        <div className="student-selection__summary">
          <div>
            <p className="student-selection__label">Estudiante seleccionado</p>
            <strong className="student-selection__value">{selectedStudentLabel}</strong>
          </div>
          <div>
            <p className="student-selection__label">Periodo</p>
            <strong className="student-selection__value">
              {selectedPeriod
                ? periodos?.find((p) => String(p.id_periodo) === selectedPeriod)?.nombre ?? `ID ${selectedPeriod}`
                : "Sin periodo"}
            </strong>
          </div>
          <button type="button" className="button" onClick={handleRunStudentPrediction} disabled={!canPredictWithStudent || studentLoading}>
            {studentLoading ? "Calculando..." : "Calcular riesgo"}
          </button>
        </div>

        {studentError && <p className="form-error">{studentError}</p>}

        {studentFeatures && (
          <FeatureGrid
            features={[
              { label: "Promedio general", value: `${studentFeatures.promedio.toFixed(2)} / 20` },
              { label: "Asistencia", value: `${studentFeatures.asistencia.toFixed(1)}%` },
              { label: "Cursos matriculados", value: String(studentFeatures.cursos_matriculados) },
              { label: "Cursos desaprobados", value: String(studentFeatures.cursos_desaprobados) }
            ]}
          />
        )}

        {studentPrediction && (
          <PredictionResultCard
            title="Resultado con datos institucionales"
            prediction={studentPrediction}
            helper="Basado en la información consolidada del periodo seleccionado."
          />
        )}
      </section>

      <section className="surface model-section">
        <header className="section-header">
          <div>
            <p className="section-header__eyebrow">Modo 2 · Escenario manual</p>
            <h2 className="section-header__title">Ingresar valores manualmente</h2>
            <p className="section-header__meta">Use este modo para pruebas rápidas o simulaciones hipotéticas.</p>
          </div>
          <button type="button" className="button button--ghost" onClick={() => setManualValues(DEFAULT_MANUAL_VALUES)}>
            Restablecer valores
          </button>
        </header>

        <form className="model-form__grid" onSubmit={handleManualSubmit}>
          <label className="field">
            <span className="field__label">Promedio general (0-20)</span>
            <input
              type="number"
              min={0}
              max={20}
              step="0.1"
              className="field__control"
              value={manualValues.promedio}
              onChange={(event) => handleManualChange("promedio", Number(event.target.value))}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Asistencia (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step="0.5"
              className="field__control"
              value={manualValues.asistencia}
              onChange={(event) => handleManualChange("asistencia", Number(event.target.value))}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Cursos matriculados</span>
            <input
              type="number"
              min={1}
              step="1"
              className="field__control"
              value={manualValues.cursos_matriculados}
              onChange={(event) => handleManualChange("cursos_matriculados", Number(event.target.value))}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Cursos desaprobados</span>
            <input
              type="number"
              min={0}
              step="1"
              className="field__control"
              value={manualValues.cursos_desaprobados}
              onChange={(event) => handleManualChange("cursos_desaprobados", Number(event.target.value))}
              required
            />
          </label>
          <div className="model-form__actions">
            <button type="submit" className="button" disabled={manualLoading}>
              {manualLoading ? "Calculando..." : "Obtener predicción"}
            </button>
          </div>
        </form>

        {manualError && <p className="form-error">{manualError}</p>}

        {manualPrediction && (
          <PredictionResultCard
            title="Resultado con datos manuales"
            prediction={manualPrediction}
            helper="Recuerde validar con la historia académica del estudiante antes de tomar decisiones."
          />
        )}
      </section>
    </div>
  );
}

function StudentSearchList({
  results,
  isSearching,
  minCharsReached,
  onSelect,
  selectedId
}: {
  results: StudentItem[];
  isSearching: boolean;
  minCharsReached: boolean;
  onSelect: (student: StudentItem) => void;
  selectedId?: number;
}) {
  if (!minCharsReached) {
    return <p className="student-search__status">Introduzca al menos 3 caracteres para iniciar la búsqueda.</p>;
  }

  if (isSearching) {
    return <p className="student-search__status">Buscando coincidencias...</p>;
  }

  if (!results.length) {
    return <p className="student-search__status">Sin resultados. Intente con otro término o revise la ortografía.</p>;
  }

  return (
    <ul className="student-search__results">
      {results.map((student) => {
        const isActive = selectedId === student.id_estudiante;
        return (
          <li key={student.id_estudiante}>
            <button
              type="button"
              className={`student-search__option${isActive ? " is-selected" : ""}`}
              onClick={() => onSelect(student)}
            >
              <div>
                <strong>{formatStudentName(student)}</strong>
                <p>
                  {student.dni ?? "Sin documento"} · {student.programa ?? "Programa sin registrar"}
                </p>
              </div>
              <span className="student-search__meta">{student.codigo_alumno ?? "SN"}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function PredictionResultCard({ title, prediction, helper }: { title: string; prediction: DropoutPredictionResult; helper: string }) {
  return (
    <article className="prediction-card">
      <header>
        <p className="prediction-card__eyebrow">Resultado del modelo</p>
        <h3 className="prediction-card__title">{title}</h3>
      </header>
      <div className="prediction-card__body">
        <span className={`prediction-card__badge ${resolveBadgeVariant(prediction.nivel)}`}>{prediction.nivel}</span>
        <p className="prediction-card__probability">{formatProbability(prediction.probabilidad)} de probabilidad de deserción</p>
        <p className="prediction-card__helper">{helper}</p>
        <p className="prediction-card__recommendation">
          {prediction.prediccion
            ? "Se recomienda activar un plan de acompañamiento personalizado."
            : "Mantener seguimiento periódico y reforzar factores protectores."}
        </p>
      </div>
    </article>
  );
}

function FeatureGrid({ features }: { features: Array<{ label: string; value: string }> }) {
  return (
    <div className="feature-grid">
      {features.map((feature) => (
        <article key={feature.label} className="feature-grid__item">
          <span className="feature-grid__label">{feature.label}</span>
          <strong className="feature-grid__value">{feature.value}</strong>
        </article>
      ))}
    </div>
  );
}

function formatStudentName(student: StudentItem) {
  const lastNames = [student.apellido_paterno, student.apellido_materno].filter(Boolean).join(" ");
  const names = student.nombres ?? "";
  return `${lastNames}, ${names}`.replace(/^,\s*/, "").trim() || "Sin nombre";
}

function formatProbability(probability: number) {
  const pct = Math.max(0, Math.min(1, probability ?? 0)) * 100;
  return `${pct.toFixed(1)}%`;
}

function resolveBadgeVariant(level: string) {
  const normalized = (level ?? "").toLowerCase();
  if (normalized.includes("alto")) return "is-danger";
  if (normalized.includes("medio")) return "is-warning";
  if (normalized.includes("bajo")) return "is-success";
  return "";
}

function computeAttendanceAverage(records: StudentAttendanceSummary[]) {
  if (!records?.length) {
    return 0;
  }
  const values = records
    .map((item) => (typeof item.porcentaje_asistencia === "number" ? item.porcentaje_asistencia : null))
    .filter((value): value is number => value !== null);
  if (!values.length) {
    return 0;
  }
  const total = values.reduce((acc, value) => acc + value, 0);
  return total / values.length;
}

function roundTo(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value ?? 0) * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}
