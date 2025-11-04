import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { RiskSummaryItem } from "../types";
import dayjs from "dayjs";

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
      <header className="page-header">
        <h1 className="page-title">Resumen de riesgo estudiantil</h1>
        <p className="page-description">
          Visualice los puntajes generados por el modelo predictivo y priorice la atención de estudiantes con mayor riesgo.
        </p>
      </header>

      <section className="surface-card surface-card--compact">
        <div className="filters-panel">
          <label className="form-field">
            <span className="form-field__label">Periodo académico</span>
            <select
              value={filters.periodo ?? ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, periodo: Number(e.target.value) }))}
              className="select"
            >
              <option value="" disabled>
                Seleccione un periodo
              </option>
              {periodos?.map((periodo: { id_periodo: number; nombre: string }) => (
                <option key={periodo.id_periodo} value={periodo.id_periodo}>
                  {periodo.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span className="form-field__label">Programa académico</span>
            <select
              value={filters.programa ?? ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  programa: e.target.value ? Number(e.target.value) : undefined
                }))
              }
              className="select"
            >
              <option value="">Todos</option>
              {programas?.map((programa: { id_programa: number; nombre: string }) => (
                <option key={programa.id_programa} value={programa.id_programa}>
                  {programa.nombre}
                </option>
              ))}
            </select>
          </label>

          <button type="button" onClick={() => refetch()} className="button button--primary">
            {isFetching ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </section>

      <section className="stat-grid">
        <StatCard titulo="Estudiantes evaluados" valor={stats.total.toString()} descripcion="Total de registros con puntaje" />
        <StatCard
          titulo="Riesgo alto"
          valor={stats.altos.toString()}
          descripcion="Estudiantes clasificados como alto riesgo"
          color="#ef4444"
        />
        <StatCard
          titulo="Riesgo medio"
          valor={stats.medios.toString()}
          descripcion="Estudiantes clasificados como riesgo medio"
          color="#f97316"
        />
        <StatCard
          titulo="Riesgo bajo"
          valor={stats.bajos.toString()}
          descripcion="Estudiantes clasificados como riesgo bajo"
          color="#22c55e"
        />
      </section>

      <section className="surface-card">
        <header className="surface-header">
          <div>
            <h2 className="section-title">Detalle de estudiantes</h2>
            <p className="section-subtitle">
              Tabla ordenada por puntaje ascendente (menor puntaje = mayor riesgo).
            </p>
          </div>
          <span className="surface-header__meta">
            {resumen?.length ?? 0} registros · Actualizado {dayjs().format("DD/MM/YYYY HH:mm")}
          </span>
        </header>
        <div className="table-wrapper table-scroll">
          <table className="styled-table">
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
        {resumen?.length === 0 && <p className="page-description">No hay resultados para los filtros seleccionados.</p>}
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
  const style = { "--accent-color": color } as CSSProperties;
  return (
    <article className="stat-card" style={style}>
      <span className="stat-card__label">{titulo}</span>
      <strong className="stat-card__value">{valor}</strong>
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
  const nivelLower = nivel.toLowerCase();
  const variant = nivelLower.includes("alto") ? "high" : nivelLower.includes("medio") ? "medium" : nivelLower.includes("bajo") ? "low" : "neutral";

  return <span className={`badge badge--${variant}`}>{nivel}</span>;
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