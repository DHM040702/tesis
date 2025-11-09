import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { apiClient } from "../api/client";
import { RiskSummaryItem } from "../types";

type Filters = {
  periodo?: number;
  programa?: number;
};

type RiskStats = ReturnType<typeof calcularEstadisticas>;

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
  const canDownload = Boolean(resumen?.length);

  const handleDownload = useCallback(() => {
    if (!resumen?.length) return;
    const header = ["dni", "estudiante", "programa", "puntaje", "nivel", "generado_en"];
    const rows = resumen.map((item) =>
      [
        item.dni ?? "",
        item.nombre_visible ?? "",
        item.programa ?? "",
        formatPuntaje(item.puntaje),
        item.nivel ?? "",
        dayjs(item.creado_en).format("YYYY-MM-DD HH:mm")
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resumen_riesgo_${dayjs().format("YYYYMMDD_HHmm")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [resumen]);

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">Resumen de riesgo estudiantil</h1>
        <p className="page__subtitle">Visualice los puntajes de riesgo generados por el modelo predictivo.</p>
      </header>

      <section className="surface hero-card">
        <div className="hero-card__stats">
          <div>
            <p className="page__subtitle">Seguimiento del periodo</p>
            <h2 className="hero-card__headline">{stats.total} estudiantes monitoreados</h2>
            <p className="hero-card__copy">
              Datos actualizados {dayjs().format("DD MMM YYYY, HH:mm")} · priorice cohortes de alto riesgo.
            </p>
          </div>
          <div className="hero-card__chart">
            <RiskDonut stats={stats} />
          </div>
        </div>
        <div className="hero-card__actions">
          <button type="button" className="button button--ghost" onClick={handleDownload} disabled={!canDownload}>
            Descargar CSV
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => document.getElementById("detalle-riesgo")?.scrollIntoView({ behavior: "smooth" })}
          >
            Ver detalle de cohortes
          </button>
        </div>
      </section>

      <section className="surface filters-panel">
        <div className="filters-panel__column">
          <label className="field">
            <span className="field__label">Periodo acadǸmico</span>
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
            <span className="field__label">Programa acadǸmico</span>
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
          <table id="detalle-riesgo" className="table table--md table--responsive">
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
        {resumen?.length === 0 && <p className="empty-message">No hay resultados para los filtros seleccionados.</p>}
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
      <td data-label="Documento">{item.dni}</td>
      <td data-label="Estudiante">{item.nombre_visible}</td>
      <td data-label="Programa">{item.programa}</td>
      <td data-label="Puntaje">{formatPuntaje(item.puntaje)}</td>
      <td data-label="Nivel">
        <NivelBadge nivel={item.nivel} />
      </td>
      <td data-label="Generado">{dayjs(item.creado_en).format("DD/MM/YYYY HH:mm")}</td>
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

function RiskDonut({ stats }: { stats: RiskStats }) {
  const total = stats.total || 0;
  const distribution = [
    { label: "Riesgo alto", value: stats.altos, color: "#ef4444" },
    { label: "Riesgo medio", value: stats.medios, color: "#f97316" },
    { label: "Riesgo bajo", value: stats.bajos, color: "#16a34a" }
  ];

  const segments = total
    ? distribution.reduce<{ start: number; end: number; color: string }[]>((acc, segment) => {
        const start = acc.length ? acc[acc.length - 1].end : 0;
        const sweep = (segment.value / total) * 100;
        const end = Math.min(100, start + sweep);
        acc.push({ start, end, color: segment.color });
        return acc;
      }, [])
    : [];

  const gradient = total
    ? `conic-gradient(${segments.map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`).join(", ")})`
    : "conic-gradient(#cbd5f5 0 100%)";

  return (
    <div className="risk-donut-wrapper">
      <div className="risk-donut" data-total={total} style={{ background: gradient }} />
      <div className="risk-donut__legend">
        {distribution.map((segment) => (
          <span key={segment.label} className="risk-donut__legend-item">
            <span className="risk-donut__swatch" style={{ background: segment.color }} />
            {segment.label}: {segment.value}
          </span>
        ))}
      </div>
    </div>
  );
}
