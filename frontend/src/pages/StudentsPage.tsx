import { useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { StudentItem } from "../types";

type Filters = {
  programa?: number;
  periodo?: number;
  riesgo?: string;
};

const nivelesColores: Record<string, string> = {
  alto: "high",
  medio: "medium",
  bajo: "low"
};

export function StudentsPage() {
  const [filters, setFilters] = useState<Filters>({});
  const { data: periodos } = useQuery({ queryKey: ["periodos"], queryFn: () => apiClient.getPeriodos() });
  const { data: programas } = useQuery({ queryKey: ["programas"], queryFn: () => apiClient.getProgramas() });
  const { data: niveles } = useQuery({ queryKey: ["niveles"], queryFn: () => apiClient.getNivelesRiesgo() });

  const { data: estudiantes, isFetching } = useQuery({
    queryKey: ["estudiantes", filters],
    queryFn: () => apiClient.getStudents(filters),
    placeholderData: []
  });

  const totales = useMemo(() => calcularTotales(estudiantes ?? []), [estudiantes]);

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Listado de estudiantes</h1>
        <p className="page-description">
          Filtre por programa, periodo o nivel de riesgo para priorizar la atención de los estudiantes que más lo necesitan.
        </p>
      </header>

      <section className="surface-card surface-card--compact">
        <div className="filters-panel">
          <FiltroSelect
            label="Programa académico"
            value={filters.programa ?? ""}
            onChange={(value) => setFilters((prev) => ({ ...prev, programa: value ? Number(value) : undefined }))}
            opciones={[
              { value: "", label: "Todos" },
              ...(programas ?? []).map((p: { id_programa: number; nombre: string }) => ({
                value: String(p.id_programa),
                label: p.nombre
              }))
            ]}
          />
          <FiltroSelect
            label="Periodo"
            value={filters.periodo ?? ""}
            onChange={(value) => setFilters((prev) => ({ ...prev, periodo: value ? Number(value) : undefined }))}
            opciones={[
              { value: "", label: "Todos" },
              ...(periodos ?? []).map((p: { id_periodo: number; nombre: string }) => ({
                value: String(p.id_periodo),
                label: p.nombre
              }))
            ]}
          />
          <FiltroSelect
            label="Nivel de riesgo"
            value={filters.riesgo ?? ""}
            onChange={(value) => setFilters((prev) => ({ ...prev, riesgo: value || undefined }))}
            opciones={[
              { value: "", label: "Todos" },
              ...(niveles ?? []).map((n: { nombre: string }) => ({ value: n.nombre, label: n.nombre }))
            ]}
          />
          <button type="button" onClick={() => setFilters({})} className="button button--subtle">
            Limpiar filtros
          </button>
        </div>
      </section>

      <section className="stat-grid">
        <ResumenCard titulo="Total" cantidad={totales.total} />
        <ResumenCard titulo="Riesgo alto" cantidad={totales.alto} colorFondo="#fee2e2" colorTexto="#b91c1c" />
        <ResumenCard titulo="Riesgo medio" cantidad={totales.medio} colorFondo="#fef3c7" colorTexto="#c2410c" />
        <ResumenCard titulo="Riesgo bajo" cantidad={totales.bajo} colorFondo="#dcfce7" colorTexto="#15803d" />
      </section>

      <section className="surface-card">
        <header className="surface-header">
          <h2 className="section-title">Resultados</h2>
          {isFetching && <span className="surface-header__meta">Cargando...</span>}
        </header>
        <div className="table-wrapper table-scroll">
          <table className="styled-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Documento</th>
                <th>Estudiante</th>
                <th>Programa</th>
                <th>Puntaje</th>
                <th>Nivel</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes?.map((est: StudentItem) => (
                <tr key={est.id_estudiante}>
                  <td>{est.codigo_alumno ?? "-"}</td>
                  <td>{est.dni ?? "-"}</td>
                  <td>{`${est.apellido_paterno ?? ""} ${est.apellido_materno ?? ""}, ${est.nombres ?? ""}`}</td>
                  <td>{est.programa ?? "-"}</td>
                  <td>{est.puntaje?.toFixed(2) ?? "-"}</td>
                  <td>
                    <NivelEtiqueta nivel={est.nivel ?? "Sin dato"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {estudiantes && estudiantes.length === 0 && (
          <p className="page-description empty-state">
            No se encontraron estudiantes con los filtros seleccionados.
          </p>
        )}
      </section>
    </div>
  );
}

function NivelEtiqueta({ nivel }: { nivel: string }) {
  const key = (nivel ?? "").toLowerCase();
  const variant = nivelesColores[key] ?? "neutral";
  return <span className={`badge badge--${variant}`}>{nivel}</span>;
}

function calcularTotales(estudiantes: StudentItem[]) {
  return estudiantes.reduce(
    (acc, item) => {
      acc.total += 1;
      const nivel = (item.nivel ?? "").toLowerCase();
      if (nivel.includes("alto")) acc.alto += 1;
      else if (nivel.includes("medio")) acc.medio += 1;
      else if (nivel.includes("bajo")) acc.bajo += 1;
      return acc;
    },
    { total: 0, alto: 0, medio: 0, bajo: 0 }
  );
}

function ResumenCard({ titulo, cantidad, colorFondo = "#eef2ff", colorTexto = "#3730a3" }: { titulo: string; cantidad: number; colorFondo?: string; colorTexto?: string }) {
  const style = { "--metric-bg": colorFondo, "--metric-color": colorTexto } as CSSProperties;
  return (
    <article className="metric-card" style={style}>
      <span className="metric-card__label">{titulo}</span>
      <strong className="metric-card__value">{cantidad}</strong>
    </article>
  );
}

function FiltroSelect({ label, value, onChange, opciones }: { label: string; value: string | number; onChange: (value: string) => void; opciones: Array<{ value: string; label: string }> }) {
  return (
    <label className="form-field">
      <span className="form-field__label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="select">
        {opciones.map((opcion) => (
          <option key={opcion.value} value={opcion.value}>
            {opcion.label}
          </option>
        ))}
      </select>
    </label>
  );
}