import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { StudentItem } from "../types";

const nivelesClases: Record<string, string> = {
  alto: "badge--danger",
  medio: "badge--warning",
  bajo: "badge--success"
};

type Filters = {
  programa?: number;
  periodo?: number;
  riesgo?: string;
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
      <header className="page__header">
        <h1 className="page__title">Listado de estudiantes</h1>
        <p className="page__subtitle">Filtre por programa, periodo o nivel de riesgo para priorizar la atención.</p>
      </header>

      <section className="surface filters-panel">
        <FiltroSelect
          label="Programa académico"
          value={filters.programa ?? ""}
          onChange={(value) => setFilters((prev) => ({ ...prev, programa: value ? Number(value) : undefined }))}
          opciones={[{ value: "", label: "Todos" }, ...(programas ?? []).map((p) => ({ value: String(p.id_programa), label: p.nombre }))]}
        />
        <FiltroSelect
          label="Periodo"
          value={filters.periodo ?? ""}
          onChange={(value) => setFilters((prev) => ({ ...prev, periodo: value ? Number(value) : undefined }))}
          opciones={[{ value: "", label: "Todos" }, ...(periodos ?? []).map((p) => ({ value: String(p.id_periodo), label: p.nombre }))]}
        />
        <FiltroSelect
          label="Nivel de riesgo"
          value={filters.riesgo ?? ""}
          onChange={(value) => setFilters((prev) => ({ ...prev, riesgo: value || undefined }))}
          opciones={[{ value: "", label: "Todos" }, ...(niveles ?? []).map((n) => ({ value: n.nombre, label: n.nombre }))]}
        />
        <button type="button" onClick={() => setFilters({})} className="button button--ghost filters-panel__action">
          Limpiar filtros
        </button>
      </section>

      <section className="summary-grid">
        <ResumenCard titulo="Total" cantidad={totales.total} />
        <ResumenCard titulo="Riesgo alto" cantidad={totales.alto} colorFondo="rgba(239, 68, 68, 0.08)" colorTexto="#b91c1c" />
        <ResumenCard titulo="Riesgo medio" cantidad={totales.medio} colorFondo="rgba(249, 115, 22, 0.08)" colorTexto="#c2410c" />
        <ResumenCard titulo="Riesgo bajo" cantidad={totales.bajo} colorFondo="rgba(34, 197, 94, 0.1)" colorTexto="#15803d" />
      </section>

      <section className="surface">
        <header className="section-header">
          <div>
            <h2 className="section-header__title">Resultados</h2>
            {isFetching && <span className="section-header__meta">Actualizando información...</span>}
          </div>
        </header>
        <div className="table-scroll">
          <table className="table table--lg">
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
              {estudiantes?.map((est) => (
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
          <p className="empty-message">No se encontraron estudiantes con los filtros seleccionados.</p>
        )}
      </section>
    </div>
  );
}

function NivelEtiqueta({ nivel }: { nivel: string }) {
  const key = nivel.toLowerCase();
  const variant = nivelesClases[key] ?? "";
  return <span className={`badge ${variant}`}>{nivel}</span>;
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

function ResumenCard({ titulo, cantidad, colorFondo = "rgba(37, 99, 235, 0.08)", colorTexto = "#1d4ed8" }: { titulo: string; cantidad: number; colorFondo?: string; colorTexto?: string }) {
  return (
    <article className="summary-card" style={{ background: colorFondo, color: colorTexto }}>
      <span className="summary-card__title">{titulo}</span>
      <strong className="summary-card__value">{cantidad}</strong>
    </article>
  );
}

function FiltroSelect({ label, value, onChange, opciones }: { label: string; value: string | number; onChange: (value: string) => void; opciones: Array<{ value: string; label: string }> }) {
  return (
    <label className="field filters-panel__column">
      <span className="field__label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="field__control">
        {opciones.map((opcion) => (
          <option key={opcion.value} value={opcion.value}>
            {opcion.label}
          </option>
        ))}
      </select>
    </label>
  );
}
