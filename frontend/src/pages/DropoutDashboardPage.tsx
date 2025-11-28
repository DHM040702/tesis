import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";

import {
  AcademicAttendanceResponse,
  DropoutPredictionRequest,
  DropoutPredictionResult,
  StudentItem
} from "../types";

/* --------------------------------------------------------
   CONFIGURACIÓN
-------------------------------------------------------- */

const MIN_SEARCH_LENGTH = 3;

const DEFAULT_MANUAL_VALUES: DropoutPredictionRequest = {
  promedio: 12,
  asistencia: 80,
  cursos_matriculados: 5,
  cursos_desaprobados: 0
};

/* --------------------------------------------------------
   COMPONENTE PRINCIPAL
-------------------------------------------------------- */

export function DropoutDashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedTerm = useDebouncedValue(searchTerm, 400);
  const normalizedTerm = debouncedTerm.trim();

  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  const [studentFeatures, setStudentFeatures] =
    useState<DropoutPredictionRequest | null>(null);
  const [studentPrediction, setStudentPrediction] =
    useState<DropoutPredictionResult | null>(null);

  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  // Manual mode
  const [manualValues, setManualValues] =
    useState<DropoutPredictionRequest>(DEFAULT_MANUAL_VALUES);
  const [manualPrediction, setManualPrediction] =
    useState<DropoutPredictionResult | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  /* --------------------------------------------------------
     CARGA DE PERIODOS
  -------------------------------------------------------- */
  const { data: periodos } = useQuery({
    queryKey: ["periodos"],
    queryFn: () => apiClient.getPeriodos()
  });

  useEffect(() => {
    if (!selectedPeriod && periodos && periodos.length > 0) {
      setSelectedPeriod(String(periodos[0].id_periodo));
    }
  }, [periodos, selectedPeriod]);

  /* --------------------------------------------------------
     BÚSQUEDA DE ESTUDIANTE
  -------------------------------------------------------- */
  const { data: searchResult, isFetching: isSearching } = useQuery({
    queryKey: ["student-search", normalizedTerm],
    enabled: normalizedTerm.length >= MIN_SEARCH_LENGTH,
    queryFn: () =>
      apiClient.searchStudentsByCode({
        codigo: normalizedTerm,
        max_alumnos: 10
      })
  });

  const studentOptions = useMemo(() => {
    const base = searchResult ?? [];
    if (!base.length) return [];

    const n = normalizedTerm.toLowerCase();
    return base.filter((s) => {
      const fullName = formatStudentName(s).toLowerCase();
      return (
        (s.codigo_alumno ?? "").toLowerCase().includes(n) ||
        (s.dni ?? "").toLowerCase().includes(n) ||
        fullName.includes(n)
      );
    });
  }, [normalizedTerm, searchResult]);

  const canPredictWithStudent = Boolean(selectedStudent && selectedPeriod);
  const selectedStudentLabel = selectedStudent
    ? formatStudentName(selectedStudent)
    : "Sin selección";

  /* --------------------------------------------------------
     EJECUTAR PREDICCIÓN CON DATOS INSTITUCIONALES
  -------------------------------------------------------- */
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
        apiClient.getAcademicGrades({
          id_estudiante: selectedStudent.id_estudiante,
          id_periodo: periodId
        }),

        apiClient.getAcademicAsistencias({
          id_estudiante: selectedStudent.id_estudiante,
          id_periodo: periodId
        }),

        apiClient.getAcademicMatriculas({
          id_estudiante: selectedStudent.id_estudiante,
          id_periodo: periodId
        })
      ]);

      const promedio =
        typeof grades.promedio_general === "number"
          ? grades.promedio_general
          : 0;

      const cursosMatriculados = Math.max(
        grades.detalle?.length ?? 0,
        matriculas?.length ?? 0
      );

      const cursosDesaprobados = grades.detalle.reduce((acc, item) => {
        const estado = (item.estado ?? "").toLowerCase();
        if (
          estado.includes("desaprob") ||
          (typeof item.nota_final === "number" && item.nota_final < 11)
        ) {
          return acc + 1;
        }
        return acc;
      }, 0);

      const asistencia = computeAttendanceFromResponse(attendance);

      if (!cursosMatriculados && !promedio) {
        throw new Error(
          "No se encontraron registros académicos para el periodo seleccionado."
        );
      }

      const payload: DropoutPredictionRequest = {
        promedio: roundTo(promedio, 2),
        asistencia: roundTo(asistencia, 2),
        cursos_matriculados: cursosMatriculados || 1,
        cursos_desaprobados: Math.min(
          cursosDesaprobados,
          cursosMatriculados || 1
        )
      };

      const prediction = await apiClient.predictDropout(payload);

      setStudentFeatures(payload);
      setStudentPrediction(prediction);
    } catch (err: any) {
      const msg =
        err instanceof Error ? err.message : "No se pudo obtener la predicción.";
      setStudentError(msg);
      setStudentFeatures(null);
      setStudentPrediction(null);
    } finally {
      setStudentLoading(false);
    }
  };

  /* --------------------------------------------------------
     MANUAL MODE
  -------------------------------------------------------- */
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
    } catch (err: any) {
      const msg =
        err instanceof Error ? err.message : "No se pudo obtener la predicción.";
      setManualError(msg);
      setManualPrediction(null);
    } finally {
      setManualLoading(false);
    }
  };

  /* --------------------------------------------------------
     RENDER
  -------------------------------------------------------- */

  return (
    <div className="page">
      <header className="page__header">
        <p className="page__eyebrow">Modelo predictivo</p>
        <h1 className="page__title">Predicción de deserción</h1>
      </header>

      {/* ====================== MODO 1 ========================== */}
      <section className="surface model-section">
        <header className="section-header">
          <div>
            <p className="section-header__eyebrow">Modo 1 · Datos institucionales</p>
            <h2 className="section-header__title">Utilizar un estudiante existente</h2>
          </div>

          {selectedStudent && (
            <button
              className="button button--ghost"
              onClick={() => setSelectedStudent(null)}
            >
              Limpiar selección
            </button>
          )}
        </header>

        {/* Búsqueda */}
        <div className="model-form__grid">
          <label className="field">
            <span className="field__label">Buscar estudiante</span>
            <input
              type="text"
              className="field__control"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Código, DNI o nombre"
            />
            <span className="field__hint">
              Ingrese al menos {MIN_SEARCH_LENGTH} caracteres.
            </span>
          </label>

          <label className="field">
            <span className="field__label">Periodo</span>
            <select
              className="field__control"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              {periodos?.map((p) => (
                <option key={p.id_periodo} value={p.id_periodo}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Resultados búsqueda */}
        <StudentSearchList
          results={studentOptions}
          isSearching={isSearching}
          minCharsReached={normalizedTerm.length >= MIN_SEARCH_LENGTH}
          onSelect={(s) => setSelectedStudent(s)}
          selectedId={selectedStudent?.id_estudiante}
        />

        {/* Resumen */}
        <div className="student-selection__summary">
          <div>
            <p className="student-selection__label">Estudiante</p>
            <strong>{selectedStudentLabel}</strong>
          </div>

          <div>
            <p className="student-selection__label">Periodo</p>
            <strong>
              {selectedPeriod
                ? (periodos?.find((p) => `${p.id_periodo}` === selectedPeriod)?.nombre)
                : "Sin periodo"}
            </strong>
          </div>

          <button
            className="button"
            onClick={handleRunStudentPrediction}
            disabled={!canPredictWithStudent || studentLoading}
          >
            {studentLoading ? "Calculando..." : "Calcular riesgo"}
          </button>
        </div>

        {studentError && <p className="form-error">{studentError}</p>}

        {studentFeatures && (
          <FeatureGrid
            features={[
              { label: "Promedio", value: `${studentFeatures.promedio.toFixed(2)}` },
              { label: "Asistencia", value: `${studentFeatures.asistencia.toFixed(1)}%` },
              { label: "Cursos matriculados", value: `${studentFeatures.cursos_matriculados}` },
              { label: "Cursos desaprobados", value: `${studentFeatures.cursos_desaprobados}` }
            ]}
          />
        )}

        {studentPrediction && (
          <PredictionResultCard
            title="Resultado con datos institucionales"
            prediction={studentPrediction}
            helper="Basado en información consolidada del periodo."
          />
        )}
      </section>

      {/* ====================== MODO 2 ========================== */}
      <section className="surface model-section">
        <header className="section-header">
          <div>
            <p className="section-header__eyebrow">Modo 2 · Escenario manual</p>
            <h2 className="section-header__title">Ingresar valores manuales</h2>
          </div>

          <button
            className="button button--ghost"
            onClick={() => setManualValues(DEFAULT_MANUAL_VALUES)}
          >
            Restablecer valores
          </button>
        </header>

        {/* Form manual */}
        <form className="model-form__grid" onSubmit={handleManualSubmit}>
          <label className="field">
            <span className="field__label">Promedio (0–20)</span>
            <input
              type="number"
              className="field__control"
              min={0}
              max={20}
              step={0.1}
              value={manualValues.promedio}
              onChange={(e) => handleManualChange("promedio", Number(e.target.value))}
              required
            />
          </label>

          <label className="field">
            <span className="field__label">Asistencia (%)</span>
            <input
              type="number"
              className="field__control"
              min={0}
              max={100}
              step={0.5}
              value={manualValues.asistencia}
              onChange={(e) => handleManualChange("asistencia", Number(e.target.value))}
              required
            />
          </label>

          <label className="field">
            <span className="field__label">Cursos matriculados</span>
            <input
              type="number"
              className="field__control"
              min={1}
              step={1}
              value={manualValues.cursos_matriculados}
              onChange={(e) =>
                handleManualChange("cursos_matriculados", Number(e.target.value))
              }
              required
            />
          </label>

          <label className="field">
            <span className="field__label">Cursos desaprobados</span>
            <input
              type="number"
              className="field__control"
              min={0}
              step={1}
              value={manualValues.cursos_desaprobados}
              onChange={(e) =>
                handleManualChange("cursos_desaprobados", Number(e.target.value))
              }
              required
            />
          </label>

          <div className="model-form__actions">
            <button className="button" type="submit" disabled={manualLoading}>
              {manualLoading ? "Calculando..." : "Obtener predicción"}
            </button>
          </div>
        </form>

        {manualError && <p className="form-error">{manualError}</p>}

        {manualPrediction && (
          <PredictionResultCard
            title="Resultado con valores manuales"
            prediction={manualPrediction}
            helper="Simulación manual."
          />
        )}
      </section>
    </div>
  );
}

/* --------------------------------------------------------
   SUBCOMPONENTES
-------------------------------------------------------- */

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
    return (
      <p className="student-search__status">
        Introduzca al menos 3 caracteres.
      </p>
    );
  }

  if (isSearching) {
    return <p className="student-search__status">Buscando...</p>;
  }

  if (!results.length) {
    return (
      <p className="student-search__status">Sin resultados para este criterio.</p>
    );
  }

  return (
    <ul className="student-search__results">
      {results.map((s) => {
        const active = selectedId === s.id_estudiante;
        return (
          <li key={s.id_estudiante}>
            <button
              type="button"
              className={`student-search__option${active ? " is-selected" : ""}`}
              onClick={() => onSelect(s)}
            >
              <div>
                <strong>{formatStudentName(s)}</strong>
                <p>
                  {s.dni ?? "Sin DNI"} · {s.programa ?? "Sin programa"}
                </p>
              </div>

              <span className="student-search__meta">
                {s.codigo_alumno ?? "SN"}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function PredictionResultCard({
  title,
  prediction,
  helper
}: {
  title: string;
  prediction: DropoutPredictionResult;
  helper: string;
}) {
  return (
    <article className="prediction-card">
      <header>
        <h3 className="prediction-card__title">{title}</h3>
      </header>

      <div className="prediction-card__body">
        <span
          className={`prediction-card__badge ${resolveBadgeVariant(
            prediction.nivel
          )}`}
        >
          {prediction.nivel}
        </span>

        <p className="prediction-card__probability">
          {formatProbability(prediction.probabilidad)} de probabilidad
        </p>

        <p className="prediction-card__helper">{helper}</p>
      </div>
    </article>
  );
}

function FeatureGrid({
  features
}: {
  features: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="feature-grid">
      {features.map((f) => (
        <article key={f.label} className="feature-grid__item">
          <span className="feature-grid__label">{f.label}</span>
          <strong className="feature-grid__value">{f.value}</strong>
        </article>
      ))}
    </div>
  );
}

/* --------------------------------------------------------
   UTILIDADES
-------------------------------------------------------- */

function computeAttendanceFromResponse(
  attendance: AcademicAttendanceResponse | null | undefined
): number {
  if (!attendance) return 0;

  if (typeof attendance.asistencia_global === "number") {
    return attendance.asistencia_global;
  }

  const records = attendance.detalle ?? [];
  if (!records.length) return 0;

  const values = records
    .map((r) =>
      typeof r.porcentaje_asistencia === "number"
        ? r.porcentaje_asistencia
        : null
    )
    .filter((v): v is number => v !== null);

  if (!values.length) return 0;

  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

function formatStudentName(s: StudentItem) {
  const lastNames = [s.apellido_paterno, s.apellido_materno]
    .filter(Boolean)
    .join(" ");
  const names = s.nombres ?? "";
  return `${lastNames}, ${names}`.replace(/^,\s*/, "").trim();
}

function formatProbability(prob: number) {
  const pct = Math.max(0, Math.min(1, prob ?? 0)) * 100;
  return `${pct.toFixed(1)}%`;
}

function resolveBadgeVariant(level: string) {
  const n = (level ?? "").toLowerCase();
  if (n.includes("alto")) return "is-danger";
  if (n.includes("medio")) return "is-warning";
  if (n.includes("bajo")) return "is-success";
  return "";
}

function roundTo(value: number, digits = 2) {
  const factor = Math.pow(10, digits);
  return Math.round((value ?? 0) * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}
