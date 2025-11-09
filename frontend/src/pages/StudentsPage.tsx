import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { StudentItem } from "../types";

const nivelesClases: Record<string, string> = {
  alto: "badge--danger",
  medio: "badge--warning",
  bajo: "badge--success"
};

const nivelIconos: Record<string, string> = {
  alto: "ÔÜá",
  medio: "Ôû│",
  bajo: "Ô£ô"
};

type Filters = {
  programa?: number;
  periodo?: number;
  riesgo?: string;
};

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40];

export function StudentsPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data: periodos } = useQuery({ queryKey: ["periodos"], queryFn: () => apiClient.getPeriodos() });
  const { data: programas } = useQuery({ queryKey: ["programas"], queryFn: () => apiClient.getProgramas() });
  const { data: niveles } = useQuery({ queryKey: ["niveles"], queryFn: () => apiClient.getNivelesRiesgo() });

  const { data: estudiantes, isFetching } = useQuery({
    queryKey: ["estudiantes", filters, page, pageSize],
    queryFn: () =>
      apiClient.getStudents({
        ...filters,
        page,
        pageSize
      }),
    placeholderData: () => ({ items: [], total: 0, page, pageSize })
  });

  const totales = useMemo(() => calcularTotales(estudiantes?.items ?? []), [estudiantes]);
  const totalEstudiantes = estudiantes?.total ?? 0;

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">Listado de estudiantes</h1>
        <p className="page__subtitle">Filtre por programa, periodo o nivel de riesgo para priorizar la atenci├│n.</p>
      </header>

      <section className="surface filters-panel">
        <FiltroSelect
          label="Programa acad├®mico"
          value={filters.programa ?? ""}
          onChange={(value) => {
            setFilters((prev) => ({ ...prev, programa: value ? Number(value) : undefined }));
            setPage(1);
          }}
          opciones={[{ value: "", label: "Todos" }, ...(programas ?? []).map((p) => ({ value: String(p.id_programa), label: p.nombre }))]}
        />
        <FiltroSelect
          label="Periodo"
          value={filters.periodo ?? ""}
          onChange={(value) => {
            setFilters((prev) => ({ ...prev, periodo: value ? Number(value) : undefined }));
            setPage(1);
          }}
          opciones={[{ value: "", label: "Todos" }, ...(periodos ?? []).map((p) => ({ value: String(p.id_periodo), label: p.nombre }))]}
        />
        <FiltroSelect
          label="Nivel de riesgo"
          value={filters.riesgo ?? ""}
          onChange={(value) => {
            setFilters((prev) => ({ ...prev, riesgo: value || undefined }));
            setPage(1);
          }}
          opciones={[{ value: "", label: "Todos" }, ...(niveles ?? []).map((n) => ({ value: n.nombre, label: n.nombre }))]}
        />
        <button
          type="button"
          onClick={() => {
            setFilters({});
            setPage(1);
          }}
          className="button button--ghost filters-panel__action"
        >
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
            {isFetching && <span className="section-header__meta">Actualizando informaci├│n...</span>}
          </div>
        </header>
        <div className="table-scroll">
          <table className="table table--lg table--responsive">
            <thead>
              <tr>
                <th>C├│digo</th>
                <th>Documento</th>
                <th>Estudiante</th>
                <th>Programa</th>
                <th>Puntaje</th>
                <th>Nivel</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes?.items.map((est) => (
                <tr key={est.id_estudiante}>
                  <td data-label="C´┐¢´┐¢digo">{est.codigo_alumno ?? "-"}</td>
                  <td data-label="Documento">{est.dni ?? "-"}</td>
                  <td data-label="Estudiante">{`${est.apellido_paterno ?? ""} ${est.apellido_materno ?? ""}, ${est.nombres ?? ""}`}</td>
                  <td data-label="Programa">{est.programa ?? "-"}</td>
                  <td data-label="Puntaje">{formatearPuntaje(est.puntaje)}</td>
                  <td data-label="Nivel">
                    <NivelEtiqueta nivel={est.nivel ?? "Sin dato"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {estudiantes && estudiantes.items.length === 0 && (
          <p className="empty-message">No se encontraron estudiantes con los filtros seleccionados.</p>
        )}
        <PaginationControls
          page={page}
          pageSize={pageSize}
          totalItems={totalEstudiantes}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          isFetching={isFetching}
        />
      </section>
    </div>
  );
}

function PaginationControls({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  isFetching
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isFetching: boolean;
}) {
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 1;
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = totalItems === 0 ? 0 : Math.min(page * pageSize, totalItems);

  return (
    <div className="table-pagination">
      <div className="table-pagination__info">
        {totalItems === 0 ? "No hay estudiantes para mostrar" : `Mostrando ${start}-${end} de ${totalItems} estudiantes`}
        {isFetching && <span className="table-pagination__updating">Actualizando...</span>}
      </div>
      <div className="table-pagination__actions">
        <label className="field table-pagination__page-size">
          <span className="field__label">Registros por p├ígina</span>
          <select
            className="field__control"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="table-pagination__buttons">
          <button
            type="button"
            className="button button--ghost"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            Anterior
          </button>
          <span className="table-pagination__page-indicator">
            P├ígina {Math.min(page, totalPages)} de {totalPages}
          </span>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

function formatearPuntaje(valor: StudentItem["puntaje"]) {
  if (typeof valor === "number") {
    return valor.toFixed(2);
  }
  if (typeof valor === "string" && valor.trim() !== "") {
    return valor;
  }
  return "-";
}

function NivelEtiqueta({ nivel }: { nivel: string }) {
  const key = nivel.toLowerCase();
  const variant = nivelesClases[key] ?? "";
  const icon = nivelIconos[key] ?? "ÔÇó";
  return (
    <span className={`badge ${variant}`}>
      <span aria-hidden>{icon}</span>
      <span>{nivel}</span>
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
