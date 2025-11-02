
import { useEffect, useMemo, useState } from "react";
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
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <header>
        <h1 style={{ margin: 0, color: "#111827" }}>Resumen de riesgo estudiantil</h1>
        <p style={{ color: "#4b5563", marginTop: "8px" }}>
          Visualice los puntajes de riesgo generados por el modelo predictivo.
        </p>
      </header>

      <section
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          background: "#fff",
          padding: "20px",
          borderRadius: "12px",
          boxShadow: "0 12px 24px rgba(15, 23, 42, 0.05)"
        }}
      >
        <div style={{ minWidth: "220px", flex: 1 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span>Periodo académico</span>
            <select
              value={filters.periodo ?? ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, periodo: Number(e.target.value) }))}
              style={selectStyle}
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
        <div style={{ minWidth: "220px", flex: 1 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span>Programa académico</span>
            <select
              value={filters.programa ?? ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  programa: e.target.value ? Number(e.target.value) : undefined
                }))
              }
              style={selectStyle}
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
        <button
          type="button"
          onClick={() => refetch()}
          style={buttonStyle}
        >
          {isFetching ? "Actualizando..." : "Actualizar"}
        </button>
      </section>

      <section style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <StatCard titulo="Estudiantes evaluados" valor={stats.total.toString()} descripcion="Total de registros con puntaje" />
        <StatCard titulo="Riesgo alto" valor={stats.altos.toString()} descripcion="Estudiantes clasificados como alto riesgo" color="#ef4444" />
        <StatCard titulo="Riesgo medio" valor={stats.medios.toString()} descripcion="Estudiantes clasificados como riesgo medio" color="#f97316" />
        <StatCard titulo="Riesgo bajo" valor={stats.bajos.toString()} descripcion="Estudiantes clasificados como riesgo bajo" color="#22c55e" />
      </section>

      <section
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "12px",
          boxShadow: "0 12px 24px rgba(15, 23, 42, 0.05)",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>Detalle de estudiantes</h2>
            <p style={{ color: "#6b7280", marginTop: "4px" }}>
              Tabla ordenada por puntaje ascendente (menor puntaje = mayor riesgo).
            </p>
          </div>
          <span style={{ color: "#9ca3af" }}>
            {resumen?.length ?? 0} registros · Actualizado {dayjs().format("DD/MM/YYYY HH:mm")}
          </span>
        </header>
        <div className="table-scroll">
          <table style={tableStyle}>
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
          <p style={{ color: "#6b7280", textAlign: "center" }}>No hay resultados para los filtros seleccionados.</p>
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
    <article
      style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 12px 24px rgba(15, 23, 42, 0.05)",
        display: "flex",
        flexDirection: "column",
        gap: "8px"
      }}
    >
      <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>{titulo}</span>
      <strong style={{ fontSize: "2.25rem", color }}>{valor}</strong>
      <span style={{ color: "#9ca3af", fontSize: "0.9rem" }}>{descripcion}</span>
    </article>
  );
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

function RowResumen({ item }: { item: RiskSummaryItem }) {
  return (
    <tr>
      <td>{item.dni}</td>
      <td>{item.nombre_visible}</td>
      <td>{item.programa}</td>
      <td>{item.puntaje.toFixed(2)}</td>
      <td>
        <NivelBadge nivel={item.nivel} />
      </td>
      <td>{dayjs(item.creado_en).format("DD/MM/YYYY HH:mm")}</td>
    </tr>
  );
}

function NivelBadge({ nivel }: { nivel: string }) {
  const color = nivel.toLowerCase().includes("alto")
    ? "#fee2e2"
    : nivel.toLowerCase().includes("medio")
      ? "#fef3c7"
      : "#dcfce7";
  const text = nivel.toLowerCase().includes("alto")
    ? "#b91c1c"
    : nivel.toLowerCase().includes("medio")
      ? "#c2410c"
      : "#15803d";
  return (
    <span
      style={{
        background: color,
        color: text,
        padding: "4px 8px",
        borderRadius: "999px",
        fontSize: "0.85rem",
        fontWeight: 600
      }}
    >
      {nivel}
    </span>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  background: "#fff"
};

const buttonStyle: React.CSSProperties = {
  alignSelf: "flex-end",
  padding: "12px 20px",
  borderRadius: "10px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  fontWeight: 600,
  cursor: "pointer"
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "720px"
};