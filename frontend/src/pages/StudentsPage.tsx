import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { StudentItem } from "../types";

const nivelesColores: Record<string, { fondo: string; texto: string }> = {
  alto: { fondo: "#fee2e2", texto: "#b91c1c" },
  medio: { fondo: "#fef3c7", texto: "#c2410c" },
  bajo: { fondo: "#dcfce7", texto: "#15803d" }
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
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <header>
        <h1 style={{ margin: 0, color: "#111827" }}>Listado de estudiantes</h1>
        <p style={{ color: "#4b5563", marginTop: "8px" }}>
          Filtre por programa, periodo o nivel de riesgo para priorizar la atención.
        </p>
      </header>

      <section style={filtersContainer}>
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
        <button type="button" onClick={() => setFilters({})} style={buttonStyle}>
          Limpiar filtros
        </button>
      </section>

      <section style={cardsGrid}>
        <ResumenCard titulo="Total" cantidad={totales.total} />
        <ResumenCard titulo="Riesgo alto" cantidad={totales.alto} colorFondo="#fee2e2" colorTexto="#b91c1c" />
        <ResumenCard titulo="Riesgo medio" cantidad={totales.medio} colorFondo="#fef3c7" colorTexto="#c2410c" />
        <ResumenCard titulo="Riesgo bajo" cantidad={totales.bajo} colorFondo="#dcfce7" colorTexto="#15803d" />
      </section>

      <section style={tablaContainer}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h2 style={{ margin: 0 }}>Resultados</h2>
          {isFetching && <span style={{ color: "#9ca3af" }}>Cargando...</span>}
        </header>
        <div className="table-scroll">
          <table style={tablaStyle}>
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
          <p style={{ color: "#6b7280", textAlign: "center", marginTop: "16px" }}>
            No se encontraron estudiantes con los filtros seleccionados.
          </p>
        )}
      </section>
    </div>
  );
}

function NivelEtiqueta({ nivel }: { nivel: string }) {
  const key = nivel.toLowerCase();
  const estilos = nivelesColores[key] ?? { fondo: "#e5e7eb", texto: "#374151" };
  return (
    <span style={{ background: estilos.fondo, color: estilos.texto, padding: "4px 10px", borderRadius: "999px", fontWeight: 600 }}>
      {nivel}
    </span>
  );
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
  return (
    <article style={{ background: colorFondo, color: colorTexto, padding: "18px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <span style={{ fontSize: "0.9rem" }}>{titulo}</span>
      <strong style={{ fontSize: "2rem" }}>{cantidad}</strong>
    </article>
  );
}

function FiltroSelect({ label, value, onChange, opciones }: { label: string; value: string | number; onChange: (value: string) => void; opciones: Array<{ value: string; label: string }> }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "200px" }}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
        {opciones.map((opcion) => (
          <option key={opcion.value} value={opcion.value}>
            {opcion.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const filtersContainer: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "16px",
  background: "#fff",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 12px 24px rgba(15, 23, 42, 0.05)"
};

const selectStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db"
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: "8px",
  border: "none",
  background: "#111827",
  color: "#fff",
  cursor: "pointer",
  alignSelf: "flex-end"
};

const cardsGrid: React.CSSProperties = {
  display: "grid",
  gap: "16px",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
};

const tablaContainer: React.CSSProperties = {
  background: "#fff",
  padding: "24px",
  borderRadius: "12px",
  boxShadow: "0 12px 24px rgba(15, 23, 42, 0.05)",
  display: "flex",
  flexDirection: "column"
};

const tablaStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "780px"
};