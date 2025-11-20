import { useCallback, useEffect, useMemo, useState, useId } from "react";
import type { MouseEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { apiClient } from "../api/client";
import { ApiUser, RiskSummaryItem } from "../types";
import { useAuth } from "../context/AuthContext";
import { resolveDashboardVariant, DashboardVariant } from "../utils/roles";

type Filters = {
  periodo?: number;
  programa?: number;
};

type RiskStats = ReturnType<typeof calcularEstadisticas>;
type RoleModalItem = {
  label: string;
  value: string;
  helper?: string;
};

export function DashboardPage() {
  const { user } = useAuth();
  const variant = resolveDashboardVariant(user?.roles);

  if (variant === "student") {
    return <StudentDashboard user={user} />;
  }
  if (variant === "tutor") {
    return <TutorDashboard />;
  }
  return <AdminDashboard />;
}

function AdminDashboard() {
  const [filters, setFilters] = useState<Filters>({});
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];
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
  const totalItems = resumen?.length ?? 0;
  const totalPages = totalItems ? Math.ceil(totalItems / pageSize) : 1;
  const currentPage = totalItems ? Math.min(page, totalPages) : 1;
  const paginatedResumen = useMemo(() => {
    if (!resumen?.length) {
      return [];
    }
    const start = (currentPage - 1) * pageSize;
    return resumen.slice(start, start + pageSize);
  }, [currentPage, pageSize, resumen]);
  const hasResults = totalItems > 0;
  const paginationStart = hasResults ? (currentPage - 1) * pageSize + 1 : 0;
  const paginationEnd = hasResults ? Math.min(currentPage * pageSize, totalItems) : 0;
  const displayPage = hasResults ? currentPage : 0;
  const displayTotalPages = hasResults ? totalPages : 0;

  useEffect(() => {
    setPage(1);
  }, [filters.periodo, filters.programa]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);
  const handleScrollToDetail = useCallback(() => {
    document.getElementById("detalle-riesgo")?.scrollIntoView({ behavior: "smooth" });
  }, []);
  const adminInsights = useMemo<RoleModalItem[]>(() => {
    const programasActivos = new Set(
      (resumen ?? [])
        .map((item) => item.programa)
        .filter((programa): programa is string => Boolean(programa))
    ).size;
    const registrosOrdenados = (resumen ?? [])
      .map((item) => item.creado_en)
      .filter(Boolean)
      .map((value) => dayjs(value))
      .sort((a, b) => b.valueOf() - a.valueOf());
    const ultimaActualizacion = registrosOrdenados.length ? registrosOrdenados[0].format("DD/MM/YYYY HH:mm") : "Sin registros";
    const periodoSeleccionado = filters.periodo
      ? periodos?.find((periodo) => periodo.id_periodo === filters.periodo)?.nombre ?? `ID ${filters.periodo}`
      : "Periodo sin seleccionar";
    const ejemploCritico = resumen?.find((item) => item.nivel.toLowerCase().includes("alto"))?.nombre_visible ?? "Sin casos";

    return [
      {
        label: "Casos criticos",
        value: stats.altos.toString(),
        helper: stats.altos > 0 ? `Ejemplo destacado: ${ejemploCritico}` : "Sin estudiantes en riesgo alto"
      },
      {
        label: "Programas monitoreados",
        value: programasActivos.toString(),
        helper: programasActivos > 0 ? "Programas con datos disponibles" : "Cargue registros para este periodo"
      },
      {
        label: "Ultima actualizacion",
        value: ultimaActualizacion,
        helper: periodoSeleccionado
      }
    ];
  }, [filters.periodo, periodos, resumen, stats.altos]);
  const canDownload = hasResults;
  const closeAdminModalAndScroll = useCallback(() => {
    setShowAdminModal(false);
    window.setTimeout(() => {
      handleScrollToDetail();
    }, 150);
  }, [handleScrollToDetail]);

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
      <br />
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
              Datos actualizados {dayjs().format("DD MMM YYYY, HH:mm")} Â· priorice cohortes de alto riesgo.
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
          <button type="button" className="button button--ghost" onClick={handleScrollToDetail}>
            Ver detalle de cohortes
          </button>
          <button type="button" className="button button--primary" onClick={() => setShowAdminModal(true)}>
            Alertas prioritarias
          </button>
        </div>
      </section>

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
            {totalItems} registros - Actualizado {dayjs().format("DD/MM/YYYY HH:mm")}
          </span>
        </header>
        <div className="table-pagination">
          <div className="table-pagination__info">
            {hasResults
              ? `Mostrando ${paginationStart}-${paginationEnd} de ${totalItems} estudiantes`
              : "No hay registros para mostrar"}
            {isFetching && <span className="table-pagination__updating">Actualizando...</span>}
          </div>
          <div className="table-pagination__actions">
            <label className="field table-pagination__page-size">
              <span className="field__label">Registros por página</span>
              <select className="field__control" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
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
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={!hasResults || currentPage <= 1}
              >
                Anterior
              </button>
              <span className="table-pagination__page-indicator">
                Página {displayPage} de {displayTotalPages}
              </span>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={!hasResults || currentPage >= totalPages}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
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
              {paginatedResumen.map((item) => (
                <RowResumen key={item.id_estudiante} item={item} />
              ))}
            </tbody>
          </table>
        </div>
        {totalItems === 0 && !isFetching && (
          <p className="empty-message">No hay resultados para los filtros seleccionados.</p>
        )}
      </section>
      <RoleModal
        open={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        title="Alertas prioritarias"
        description="Revise los indicadores clave antes de tomar decisiones operativas."
        items={adminInsights}
        footer={
          <>
            <button type="button" className="button button--ghost" onClick={handleDownload} disabled={!canDownload}>
              Descargar CSV
            </button>
            <button type="button" className="button button--primary" onClick={closeAdminModalAndScroll}>
              Ir al detalle
            </button>
          </>
        }
      />
    </div>
  );
}

function TutorDashboard() {
  const [showTutorModal, setShowTutorModal] = useState(false);
  const { data: asignados = [], isFetching: loadingAsignados, error: asignadosError } = useQuery({
    queryKey: ["tutor-dashboard", "asignados"],
    queryFn: () => apiClient.getTutorAssignments(),
    staleTime: 60_000
  });

  const { data: tutorias = [], isFetching: loadingTutorias, error: tutoriasError } = useQuery({
    queryKey: ["tutor-dashboard", "tutorias"],
    queryFn: () => apiClient.getTutorias({}),
    staleTime: 30_000
  });

  const upcomingTutorias = useMemo(() => {
    const reference = dayjs();
    return [...tutorias]
      .filter((t) => dayjs(t.fecha_hora).isAfter(reference.subtract(1, "hour")))
      .sort((a, b) => dayjs(a.fecha_hora).valueOf() - dayjs(b.fecha_hora).valueOf())
      .slice(0, 4);
  }, [tutorias]);

  const tutorStats = useMemo(() => {
    const reference = dayjs();
    const programas = new Set(asignados.map((a) => a.programa ?? "Sin programa"));
    const pendientes = tutorias.filter((t) => dayjs(t.fecha_hora).isAfter(reference)).length;
    const registradas = Math.max(0, tutorias.length - pendientes);
    return {
      asignados: asignados.length,
      programas: programas.size,
      pendientes,
      registradas
    };
  }, [asignados, tutorias]);
  const tutorModalItems = useMemo<RoleModalItem[]>(() => {
    const proximaTutoria = upcomingTutorias[0];
    return [
      {
        label: "Estudiantes activos",
        value: tutorStats.asignados.toString(),
        helper: `${tutorStats.programas} programas acompanados`
      },
      {
        label: "Sesiones pendientes",
        value: tutorStats.pendientes.toString(),
        helper: `${upcomingTutorias.length} agendadas`
      },
      {
        label: "Proxima tutoria",
        value: proximaTutoria ? dayjs(proximaTutoria.fecha_hora).format("DD MMM YYYY HH:mm") : "Sin programar",
        helper: proximaTutoria ? proximaTutoria.estudiante : "Registre una nueva sesion"
      }
    ];
  }, [tutorStats, upcomingTutorias]);

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">Panel del tutor</h1>
        <p className="page__subtitle">Supervise sus estudiantes asignados y organice las prÃ³ximas sesiones.</p>
      </header>

      <section className="surface hero-card">
        <div className="hero-card__stats">
          <div>
            <p className="page__subtitle">Seguimiento activo</p>
            <h2 className="hero-card__headline">{tutorStats.asignados} estudiantes acompaÃ±ados</h2>
            <p className="hero-card__copy">
              {tutorStats.pendientes} sesiones pendientes Â· {tutorStats.registradas} sesiones registradas este ciclo.
            </p>
          </div>
          <div className="hero-card__actions">
            <Link to="/tutorias" className="button button--primary">
              Registrar tutoría
            </Link>
            <Link to="/estudiantes" className="button button--ghost">
              Ver estudiantes
            </Link>
            <button type="button" className="button button--ghost" onClick={() => setShowTutorModal(true)}>
              Ver prioridades
            </button>
          </div>
        </div>
      </section>

      <section className="summary-grid">
        <HighlightCard titulo="Asignados" cantidad={tutorStats.asignados} />
        <HighlightCard titulo="Programas" cantidad={tutorStats.programas} colorFondo="rgba(59, 130, 246, 0.12)" colorTexto="#1d4ed8" />
        <HighlightCard titulo="Sesiones pendientes" cantidad={tutorStats.pendientes} colorFondo="rgba(249, 115, 22, 0.15)" colorTexto="#c2410c" />
        <HighlightCard titulo="Sesiones registradas" cantidad={tutorStats.registradas} colorFondo="rgba(16, 185, 129, 0.14)" colorTexto="#047857" />
      </section>

      <section className="surface">
        <header className="section-header">
          <div>
            <h2 className="section-header__title">Estudiantes asignados</h2>
            {loadingAsignados && <span className="section-header__meta">Cargando...</span>}
          </div>
        </header>
        {asignadosError && <div className="alert alert--error">No se pudieron cargar las asignaciones.</div>}
        <div className="table-scroll">
          <table className="table table--sm table--responsive">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Estudiante</th>
                <th>Programa</th>
                <th>Periodo</th>
              </tr>
            </thead>
            <tbody>
              {asignados.slice(0, 6).map((asignado) => (
                <tr key={asignado.id_estudiante}>
                  <td data-label="Documento">{asignado.dni ?? "-"}</td>
                  <td data-label="Estudiante">{asignado.estudiante ?? "Sin nombre"}</td>
                  <td data-label="Programa">{asignado.programa ?? "Sin programa"}</td>
                  <td data-label="Periodo">{asignado.periodo ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {asignados.length === 0 && !loadingAsignados && !asignadosError && (
          <p className="empty-message">AÃºn no tiene estudiantes asignados para el periodo seleccionado.</p>
        )}
      </section>

      <section className="surface">
        <header className="section-header">
          <div>
            <h2 className="section-header__title">PrÃ³ximas tutorÃ­as</h2>
            {loadingTutorias && <span className="section-header__meta">Sincronizando...</span>}
          </div>
        </header>
        {tutoriasError && <div className="alert alert--error">No se pudieron cargar las tutorÃ­as.</div>}
        {upcomingTutorias.length > 0 ? (
          <div className="timeline">
            {upcomingTutorias.map((tutoria) => (
              <article className="timeline__item" key={tutoria.id_tutoria}>
                <h3 className="timeline__title">{tutoria.tema}</h3>
                <div className="timeline__meta">
                  <span>{dayjs(tutoria.fecha_hora).format("DD MMM YYYY Â· HH:mm")}</span>
                  <span>{tutoria.estudiante}</span>
                  <span>{tutoria.periodo}</span>
                </div>
                <p className="timeline__body">{tutoria.seguimiento ?? "Sin seguimiento registrado."}</p>
              </article>
            ))}
          </div>
        ) : (
          !loadingTutorias &&
          !tutoriasError && <p className="empty-message">No hay tutorÃ­as programadas para los prÃ³ximos dÃ­as.</p>
        )}
      </section>
      <RoleModal
        open={showTutorModal}
        onClose={() => setShowTutorModal(false)}
        title="Prioridades del tutor"
        description="Identifique rapidamente que atenciones no pueden esperar."
        items={tutorModalItems}
        footer={
          <>
            <Link to="/tutorias" className="button button--primary" onClick={() => setShowTutorModal(false)}>
              Registrar tutorÃ­a
            </Link>
            <Link to="/estudiantes" className="button button--ghost" onClick={() => setShowTutorModal(false)}>
              Ver estudiantes
            </Link>
          </>
        }
      />
    </div>
  );
}

function StudentDashboard({ user }: { user: ApiUser | null }) {
  const firstName = (user?.persona?.nombres ?? user?.correo ?? "Estudiante").split(" ")[0];
  const roles = user?.roles?.join(", ") || "Sin rol asignado";
  const gradesSectionId = "mis-notas";
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const {
    data: studentSummary,
    isLoading: summaryLoading,
    error: summaryError
  } = useQuery({
    queryKey: ["student-summary"],
    queryFn: () => apiClient.getStudentSelfSummary(),
    staleTime: 1000 * 60
  });
  const {
    data: studentGrades,
    isFetching: gradesLoading,
    error: gradesError
  } = useQuery({
    queryKey: ["student-grades", selectedPeriod],
    enabled: typeof selectedPeriod === "number",
    queryFn: () => apiClient.getStudentGrades({ id_periodo: selectedPeriod! })
  });

  useEffect(() => {
    if (selectedPeriod !== null || !studentSummary) {
      return;
    }
    const defaultPeriod =
      studentSummary.periodo_sugerido ?? studentSummary.periodos_disponibles[0]?.id_periodo ?? null;
    if (typeof defaultPeriod === "number") {
      setSelectedPeriod(defaultPeriod);
    }
  }, [selectedPeriod, studentSummary]);

  const studentModalItems = useMemo<RoleModalItem[]>(() => {
    const correo = user?.correo ?? "Sin correo registrado";
    const documento = user?.persona?.dni ?? "Sin documento";
    return [
      {
        label: "Rol activo",
        value: roles,
        helper: "Define los accesos dentro del sistema"
      },
      {
        label: "Documento",
        value: documento,
        helper: "Verifique que coincida con su ficha"
      },
      {
        label: "Correo institucional",
        value: correo,
        helper: "Revise este buzon para recibir alertas"
      }
    ];
  }, [roles, user]);

  const periodOptions = studentSummary?.periodos_disponibles ?? [];
  const summaryErrorMessage = summaryError instanceof Error ? summaryError.message : null;
  const gradesErrorMessage = gradesError instanceof Error ? gradesError.message : null;
  const selectedPeriodLabel = selectedPeriod
    ? periodOptions.find((item) => item.id_periodo === selectedPeriod)?.nombre ?? "Periodo sin identificar"
    : "Seleccione un periodo";
  const riesgoActual = studentSummary?.riesgo_actual;
  const riesgoNivel = riesgoActual?.nivel ?? "Sin nivel calculado";
  const riesgoPeriodo = riesgoActual?.periodo ?? "Periodo no disponible";
  const riesgoFechaTexto = riesgoActual?.actualizado_en
    ? dayjs(riesgoActual.actualizado_en).format("DD/MM/YYYY HH:mm")
    : "Sin fecha registrada";
  const riesgoDescripcion =
    riesgoActual?.descripcion ?? "Cuando se procese tu informacion academica veras aqui el nivel de riesgo asignado.";
  const riesgoPuntaje =
    typeof riesgoActual?.puntaje === "number" ? riesgoActual.puntaje.toFixed(2) : "Sin puntaje asignado";
  const riskAccentColor = resolveRiskAccent(riesgoNivel);
  const gradeResumen = studentGrades?.resumen;
  const detalleNotas = studentGrades?.detalle ?? [];
  const statsSubtitle = selectedPeriod ? selectedPeriodLabel : "Seleccione un periodo para calcular tus indicadores";

  const scrollToGrades = useCallback(() => {
    document.getElementById(gradesSectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="page">
      <br />
      <header className="page__header">
        <h1 className="page__title">Panel del estudiante</h1>
      </header>

      <section className="surface hero-card">
        <div
          className="hero-card__stats"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 3fr) minmax(0, 1fr)",
            gap: "1.5rem",
            alignItems: "stretch"
          }}
        >
          <div className="hero-card__profile">
            <p className="hero-card__headline" style={{ fontWeight: 700 }}>
              Analisis y recursos
            </p>
            <br />
            <div className="hero-card__meta hero-card__meta--risk">
              <div className="summary-grid hero-card__risk-grid">
                <RiskInfoCard
                  label="Nivel"
                  value={summaryLoading ? "..." : <NivelBadge nivel={riesgoNivel} />}
                  helper="Clasificacion actual"
                  accentColor={riskAccentColor}
                />
                <RiskInfoCard
                  label="Puntaje"
                  value={summaryLoading ? "..." : riesgoPuntaje}
                  helper="Escala 0 - 100"
                  accentColor={riskAccentColor}
                />
                <RiskInfoCard
                  label="Periodo"
                  value={summaryLoading ? "..." : riesgoPeriodo}
                  helper="Ultimo calculo disponible"
                  accentColor="#0ea5e9"
                />
                <RiskInfoCard
                  label="Actualizado"
                  value={summaryLoading ? "..." : riesgoFechaTexto}
                  helper="Fecha y hora de procesamiento"
                  accentColor="#8b5cf6"
                />
              </div>
              {summaryErrorMessage && <p className="field__hint field__hint--error">{summaryErrorMessage}</p>}
            </div>
          </div>
          <div
            className="hero-card__actions"
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem", justifyContent: "center" }}
          >
            <Link to="/tutorias" className="button button--primary">
              Ver tutorias
            </Link>
            <button type="button" className="button button--ghost" onClick={() => setShowStudentModal(true)}>
              Recordatorios
            </button>
            <button type="button" className="button button--ghost" onClick={scrollToGrades}>
              Revisar mis notas
            </button>
            <a className="button button--ghost" href="mailto:soporte@unasam.edu.pe">
              Contactar soporte
            </a>
          </div>
        </div>
      </section>

      <section className="summary-grid">
        <StatCard titulo="Promedio general" valor={formatPromedioDetalle(studentGrades?.promedio_general)} descripcion={statsSubtitle} />
        <StatCard titulo="Cursos aprobados" valor={String(gradeResumen?.aprobados ?? 0)} descripcion="Periodo seleccionado" color="#16a34a" />
        <StatCard titulo="Cursos desaprobados" valor={String(gradeResumen?.desaprobados ?? 0)} descripcion="Periodo seleccionado" color="#dc2626" />
        <StatCard titulo="Cursos pendientes" valor={String(gradeResumen?.pendientes ?? 0)} descripcion="Periodo seleccionado" color="#f97316" />
      </section>

      <section className="surface" id={gradesSectionId}>
        <header className="section-header">
          <div>
            <h2 className="section-header__title">Mis calificaciones</h2>
            <p className="section-header__subtitle">Verifica tus notas finales por periodo academico.</p>
            {gradesLoading && <span className="section-header__meta">Actualizando informacion...</span>}
            {gradesErrorMessage && <span className="section-header__meta section-header__meta--error">{gradesErrorMessage}</span>}
          </div>
          <label className="field">
            <span className="field__label">Periodo academico</span>
            <select
              className="field__control"
              value={selectedPeriod ?? ""}
              onChange={(event) => setSelectedPeriod(event.target.value ? Number(event.target.value) : null)}
              disabled={periodOptions.length === 0}
            >
              <option value="">Seleccione un periodo</option>
              {periodOptions.map((periodo) => (
                <option key={periodo.id_periodo} value={periodo.id_periodo}>
                  {periodo.nombre}
                </option>
              ))}
            </select>
          </label>
        </header>
        {!periodOptions.length && !summaryLoading && (
          <p className="field__hint">Aun no encontramos periodos con calificaciones registradas.</p>
        )}
        <div className="table-scroll">
          <table className="table table--responsive">
            <thead>
              <tr>
                <th>Curso</th>
                <th>Creditos</th>
                <th>Nota final</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {detalleNotas.map((nota, index) => (
                <tr key={`${nota.curso}-${index}`}>
                  <td data-label="Curso">{nota.curso}</td>
                  <td data-label="Creditos">{nota.creditos ?? "-"}</td>
                  <td data-label="Nota final">{formatNotaFinal(nota.nota_final)}</td>
                  <td data-label="Estado">
                    <EstadoNotaBadge estado={nota.estado} />
                  </td>
                </tr>
              ))}
              {detalleNotas.length === 0 && (
                <tr>
                  <td colSpan={4} className="table__empty">
                    {selectedPeriod ? "Sin calificaciones registradas para este periodo." : "Seleccione un periodo para ver sus notas."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface">
        <header className="section-header">
          <div>
            <h2 className="section-header__title">Recursos utiles</h2>
            <p className="section-header__subtitle">Organiza tus tutorias y comunica cambios en tus calificaciones.</p>
          </div>
        </header>
        <div className="summary-grid">
          <StudentCard titulo="Alertas de riesgo" descripcion="Notifica a tu tutor si el nivel mostrado en este panel aumenta o cambia de periodo." />
          <StudentCard titulo="Notas observadas" descripcion="Si encuentras una nota pendiente o desaprobada revisa el detalle con tu docente o coordinador." />
          <StudentCard titulo="Agenda de tutorias" descripcion="Programa sesiones para revisar dudas sobre tu rendimiento y recibir acompanamiento." />
        </div>
      </section>
      <RoleModal
        open={showStudentModal}
        onClose={() => setShowStudentModal(false)}
        title="Recordatorios personales"
        description="Valide su informacion antes de cada sesion para agilizar la atencion."
        items={studentModalItems}
        footer={
          <>
            <Link to="/tutorias" className="button button--primary" onClick={() => setShowStudentModal(false)}>
              Ver tutorias
            </Link>
            <a className="button button--ghost" href="mailto:soporte@unasam.edu.pe" onClick={() => setShowStudentModal(false)}>
              Contactar soporte
            </a>
          </>
        }
      />
    </div>
  );
}function calcularEstadisticas(resumen: RiskSummaryItem[]) {
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

function NivelBadge({ nivel }: { nivel: string | null | undefined }) {
  const safeNivel = typeof nivel === "string" ? nivel : "Sin nivel";
  const normalized = safeNivel.toLowerCase();
  const variant = normalized.includes("alto")
    ? "badge--danger"
    : normalized.includes("medio")
      ? "badge--warning"
      : normalized.includes("bajo")
        ? "badge--success"
        : "";

  return <span className={`badge ${variant}`}>{safeNivel}</span>;
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

function HighlightCard({ titulo, cantidad, colorFondo = "rgba(37, 99, 235, 0.1)", colorTexto = "#1d4ed8" }: { titulo: string; cantidad: number; colorFondo?: string; colorTexto?: string }) {
  return (
    <article className="summary-card" style={{ background: colorFondo, color: colorTexto }}>
      <span className="summary-card__title">{titulo}</span>
      <strong className="summary-card__value">{cantidad}</strong>
    </article>
  );
}

function RiskInfoCard({
  label,
  value,
  helper,
  accentColor = "#2563eb"
}: {
  label: string;
  value: ReactNode;
  helper?: string;
  accentColor?: string;
}) {
  return (
    <article
      className="summary-card"
      style={{
        background: "rgba(255, 255, 255, 0.96)",
        color: "#0f172a",
        border: `1px solid ${accentColor}`,
        boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)"
      }}
    >
      <span className="summary-card__title" style={{ color: accentColor }}>
        {label}
      </span>
      <strong className="summary-card__value">{value}</strong>
      {helper && <p className="stat-card__description">{helper}</p>}
    </article>
  );
}

function resolveRiskAccent(nivel?: string | null) {
  const normalized =
    typeof nivel === "string" ? nivel.toLowerCase() : String(nivel ?? "").toLowerCase();
  if (normalized.includes("alto")) {
    return "#ef4444";
  }
  if (normalized.includes("medio")) {
    return "#f97316";
  }
  if (normalized.includes("bajo")) {
    return "#16a34a";
  }
  return "#2563eb";
}

function StudentCard({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <article className="summary-card" style={{ background: "rgba(255, 255, 255, 0.9)", color: "#1f2937" }}>
      <span className="summary-card__title">{titulo}</span>
      <p className="stat-card__description">{descripcion}</p>
    </article>
  );
}

function formatPromedioDetalle(valor?: number | null) {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return valor.toFixed(2);
  }
  return "Sin registro";
}

function formatNotaFinal(valor?: number | null) {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return valor.toFixed(2);
  }
  return "Pendiente";
}

function EstadoNotaBadge({ estado }: { estado: string | null }) {
  const label = estado ?? "Sin estado";
  const normalized = label.toLowerCase();
  const variant = normalized.includes("desaprob")
    ? "badge--danger"
    : normalized.includes("pend")
      ? "badge--warning"
      : normalized.includes("aprob")
        ? "badge--success"
        : "badge";
  return <span className={`badge ${variant}`}>{label}</span>;
}

type RoleModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  items: RoleModalItem[];
  footer?: ReactNode;
};

function RoleModal({ open, onClose, title, description, items, footer }: RoleModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="role-modal__overlay" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={handleOverlayClick}>
      <div className="role-modal" role="document">
        <header className="role-modal__header">
          <h2 id={titleId}>{title}</h2>
          <p>{description}</p>
          <button type="button" className="role-modal__close" onClick={onClose} aria-label="Cerrar ventana">
            &times;
          </button>
        </header>
        <div className="role-modal__body">
          {items.map((item) => (
            <article key={item.label} className="role-modal__item">
              <span className="role-modal__item-label">{item.label}</span>
              <strong className="role-modal__item-value">{item.value}</strong>
              {item.helper && <span className="role-modal__item-helper">{item.helper}</span>}
            </article>
          ))}
        </div>
        {footer && <div className="role-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

