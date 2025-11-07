import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { apiClient } from "../api/client";
import { RiskSummaryItem } from "../types";

type Filters = {
  periodo?: number;
  programa?: number;
};

export function DashboardPage() {
  const [filters, setFilters] = useState<Filters>({});
  const { data: periodos } = useQuery({
    queryKey: ["periodos"],
    queryFn: () => apiClient.getPeriodos()
  });
  const { data: programas } = useQuery({
    queryKey: ["programas"],
    queryFn: () => apiClient.getProgramas()
  });

  useEffect(() => {
    if (!filters.periodo && periodos && periodos.length > 0) {
      setFilters((prev) => ({ ...prev, periodo: periodos[0].id_periodo }));
    }
  }, [filters.periodo, periodos]);

  const { data: resumen, refetch, isFetching } = useQuery({
    queryKey: ["resumen", filters],
    enabled: Boolean(filters.periodo),
    queryFn: () =>
      apiClient.getRiskSummary({
        id_periodo: filters.periodo!,
        id_programa: filters.programa
      })
  });

  const stats = useMemo(() => calcularEstadisticas(resumen ?? []), [resumen]);

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">Resumen de riesgo estudiantil</h1>
        <p className="page__subtitle">Visualice los puntajes de riesgo generados por el modelo predictivo.</p>
      </header>

      <section className="surface filters-panel">
        <div className="filters-panel__column">
          <label className="field">
            <span className="field__label">Periodo académico</span>
            <select
              value={filters.periodo ?? ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, periodo: Number(e.target.value) }))}
              className="field__control"
            >
              <option value="" disabled>
                Seleccione un periodo
              </option>
              {periodos?.map((periodo) => (
                <option key={periodo.id_periodo} value={periodo.id_periodo}>
                  {periodo.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="filters-panel__column">
          <label className="field">
            <span className="field__label">Programa académico</span>
            <select
              value={filters.programa ?? ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  programa: e.target.value ? Number(e.target.value) : undefined
                }))
              }
              className="field__control"
            >
              <option value="">Todos</option>
              {programas?.map((programa) => (
                <option key={programa.id_programa} value={programa.id_programa}>
                  {programa.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" onClick={() => refetch()} className="button button--primary filters-panel__action">
          {isFetching ? "Actualizando..." : "Actualizar"}
        </button>
      </section>

      <section className="stats-grid">
        <StatCard titulo="Estudiantes evaluados" valor={stats.total.toString()} descripcion="Total de registros con puntaje" />
        <StatCard titulo="Riesgo alto" valor={stats.altos.toString()} descripcion="Estudiantes clasificados como alto riesgo" color="#ef4444" />
        <StatCard titulo="Riesgo medio" valor={stats.medios.toString()} descripcion="Estudiantes clasificados como riesgo medio" color="#f97316" />
        <StatCard titulo="Riesgo bajo" valor={stats.bajos.toString()} descripcion="Estudiantes clasificados como riesgo bajo" color="#16a34a" />
      </section>

      <section className="surface">
        <header className="section-header">
          <div>
            <h2 className="section-header__title">Detalle de estudiantes</h2>
            <p className="section-header__subtitle">
              Tabla ordenada por puntaje ascendente (menor puntaje = mayor riesgo).
            </p>
          </div>
          <span className="section-header__meta">
            {resumen?.length ?? 0} registros · Actualizado {dayjs().format("DD/MM/YYYY HH:mm")}
          </span>
        </header>
        <div className="table-scroll">
          <table className="table table--md">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Estudiante</th>
                <th>Programa</th>
                <th>Puntaje</th>
                <th>Nivel</th>
                <th>Generado</th>
              </tr>
            </thead>
            <tbody>
              {resumen?.map((item) => (
                <RowResumen key={item.id_estudiante} item={item} />
              ))}
            </tbody>
          </table>
        </div>
        {resumen?.length === 0 && (
          <p className="empty-message">No hay resultados para los filtros seleccionados.</p>
        )}
      </section>
    </div>
  );
}

function calcularEstadisticas(resumen: RiskSummaryItem[]) {
  const total = resumen.length;
  const altos = resumen.filter((item) => item.nivel.toLowerCase().includes("alto")).length;
  const medios = resumen.filter((item) => item.nivel.toLowerCase().includes("medio")).length;
  const bajos = resumen.filter((item) => item.nivel.toLowerCase().includes("bajo")).length;
  return { total, altos, medios, bajos };
}

function StatCard({ titulo, valor, descripcion, color = "#2563eb" }: { titulo: string; valor: string; descripcion: string; color?: string }) {
  return (
    <article className="stat-card">
      <span className="stat-card__title">{titulo}</span>
      <strong className="stat-card__value" style={{ color }}>
        {valor}
      </strong>
      <span className="stat-card__description">{descripcion}</span>
    </article>
  );
}

function RowResumen({ item }: { item: RiskSummaryItem }) {
  return (
    <tr>
      <td>{item.dni}</td>
      <td>{item.nombre_visible}</td>
      <td>{item.programa}</td>
      <td>{formatPuntaje(item.puntaje)}</td>
      <td>
        <NivelBadge nivel={item.nivel} />
      </td>
      <td>{dayjs(item.creado_en).format("DD/MM/YYYY HH:mm")}</td>
    </tr>
  );
}

function NivelBadge({ nivel }: { nivel: string }) {
  const normalized = nivel.toLowerCase();
  const variant = normalized.includes("alto")
    ? "badge--danger"
    : normalized.includes("medio")
      ? "badge--warning"
      : normalized.includes("bajo")
        ? "badge--success"
        : "";

  return <span className={`badge ${variant}`}>{nivel}</span>;
}

function formatPuntaje(puntaje: RiskSummaryItem["puntaje"]) {
  if (puntaje === null || puntaje === undefined) {
    return "N/A";
  }

  const valorNumerico = Number(puntaje);

  if (Number.isFinite(valorNumerico)) {
    return valorNumerico.toFixed(2);
  }

  return "N/A";
}