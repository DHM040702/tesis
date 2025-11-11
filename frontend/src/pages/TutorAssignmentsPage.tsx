import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AssignTutorModal } from "../components/AssignTutorModal";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { resolveDashboardVariant } from "../utils/roles";
import { formatStudentDisplay, studentFromAssignment } from "../utils/students";
import { StudentItem, TutorAssignmentItem, TutorCatalogItem } from "../types";

export function TutorAssignmentsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const variant = resolveDashboardVariant(user?.roles);
  const [selectedPeriod, setSelectedPeriod] = useState<number | undefined>(undefined);
  const [filterTerm, setFilterTerm] = useState("");
  const [newAssignmentTerm, setNewAssignmentTerm] = useState("");
  const [newAssignmentResults, setNewAssignmentResults] = useState<StudentItem[]>([]);
  const [searchingNewAssignment, setSearchingNewAssignment] = useState(false);
  const [newAssignmentError, setNewAssignmentError] = useState<string | null>(null);
  const [assignmentModalState, setAssignmentModalState] = useState<{
    open: boolean;
    student: StudentItem | null;
    assignment: TutorAssignmentItem | null;
  }>({
    open: false,
    student: null,
    assignment: null
  });

  const { data: periodos } = useQuery({
    queryKey: ["periodos"],
    queryFn: () => apiClient.getPeriodos()
  });

  useEffect(() => {
    if (!selectedPeriod && periodos?.length) {
      setSelectedPeriod(periodos[0].id_periodo);
    }
  }, [periodos, selectedPeriod]);

  const {
    data: assignments = [],
    isFetching,
    error: assignmentsError
  } = useQuery<TutorAssignmentItem[]>({
    queryKey: ["tutor-assignments", selectedPeriod],
    queryFn: () => apiClient.getTutorAssignments(selectedPeriod),
    enabled: variant === "admin" && Boolean(selectedPeriod),
    placeholderData: []
  });

  useEffect(() => {
    setNewAssignmentResults([]);
    setNewAssignmentError(null);
  }, [selectedPeriod]);

  if (variant !== "admin") {
    return (
      <div className="page">
        <header className="page__header">
          <h1 className="page__title">Asignaciones</h1>
          <p className="page__subtitle">Solo el personal administrador puede gestionar las asignaciones de tutor.</p>
        </header>
        <section className="surface">
          <p className="empty-message">No tiene permisos para acceder a esta seccion.</p>
        </section>
      </div>
    );
  }

  const filteredAssignments = useMemo(() => {
    if (!filterTerm.trim()) {
      return assignments;
    }
    const term = filterTerm.trim().toLowerCase();
    return assignments.filter((assignment) => {
      const pool = [
        assignment.estudiante,
        assignment.dni,
        assignment.programa,
        assignment.tutor,
        assignment.tutor_dni
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return pool.some((value) => value.includes(term));
    });
  }, [assignments, filterTerm]);

  const stats = useMemo(() => {
    const total = assignments.length;
    const totalTutors = new Set(
      assignments.map((item) => item.id_tutor).filter((value): value is number => Boolean(value))
    ).size;
    const totalPrograms = new Set(
      assignments.map((item) => item.programa).filter((value): value is string => Boolean(value))
    ).size;
    return { total, totalTutors, totalPrograms };
  }, [assignments]);

  const assignmentsErrorMessage = assignmentsError instanceof Error ? assignmentsError.message : null;

  const handleDashboardAssignmentSelect = (assignment: TutorAssignmentItem) => {
    setAssignmentModalState({
      open: true,
      student: studentFromAssignment(assignment),
      assignment
    });
  };

  const handleDashboardStudentSelect = (student: StudentItem) => {
    const existingAssignment = assignments.find((item) => item.id_estudiante === student.id_estudiante) ?? null;
    setAssignmentModalState({
      open: true,
      student,
      assignment: existingAssignment
    });
  };

  const closeModal = () => {
    setAssignmentModalState((prev) => ({ ...prev, open: false }));
  };

  const handleTutorAssigned = async ({ studentId, tutor }: { studentId: number; tutor: TutorCatalogItem }) => {
    await queryClient.invalidateQueries({ queryKey: ["tutor-assignments", selectedPeriod] });
    setAssignmentModalState((prev) => ({ ...prev, open: false }));
    setNewAssignmentResults((prev) => prev.filter((item) => item.id_estudiante !== studentId));
  };

  const handleStudentSearch = async () => {
    const term = newAssignmentTerm.trim();
    if (!term) {
      setNewAssignmentError("Ingrese un DNI o nombre.");
      setNewAssignmentResults([]);
      return;
    }
    if (!selectedPeriod) {
      setNewAssignmentError("Seleccione un periodo academico para registrar la asignacion.");
      setNewAssignmentResults([]);
      return;
    }
    setSearchingNewAssignment(true);
    setNewAssignmentError(null);
    try {
      const response = await apiClient.getStudents({ search: term, page: 1, pageSize: 10 });
      const items = response.items ?? [];
      setNewAssignmentResults(items);
      if (items.length === 0) {
        setNewAssignmentError("No se encontraron estudiantes para el termino indicado.");
      }
    } catch (err) {
      setNewAssignmentResults([]);
      setNewAssignmentError((err as Error).message);
    } finally {
      setSearchingNewAssignment(false);
    }
  };

  return (
    <div className="page">
      <AssignTutorModal
        open={assignmentModalState.open}
        onClose={closeModal}
        student={assignmentModalState.student}
        periodo={selectedPeriod}
        currentAssignment={assignmentModalState.assignment ?? undefined}
        onTutorAssigned={handleTutorAssigned}
      />
      <header className="page__header">
        <h1 className="page__title">Dashboard de asignaciones</h1>
        <p className="page__subtitle">Visualice, filtre y actualice las asignaciones de tutor por periodo academico.</p>
      </header>

      <section className="surface">
        <div className="form-grid">
          <label className="field">
            <span className="field__label">Periodo academico</span>
            <select
              className="field__control"
              value={selectedPeriod ?? ""}
              onChange={(event) => setSelectedPeriod(event.target.value ? Number(event.target.value) : undefined)}
            >
              <option value="">Seleccione un periodo</option>
              {periodos?.map((periodo) => (
                <option key={periodo.id_periodo} value={periodo.id_periodo}>
                  {periodo.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Filtro rapido</span>
            <input
              type="text"
              className="field__control"
              placeholder="Filtrar por estudiante, tutor o programa"
              value={filterTerm}
              onChange={(event) => setFilterTerm(event.target.value)}
            />
          </label>
        </div>

        <div className="summary-grid">
          <article className="summary-card">
            <span className="summary-card__title">Estudiantes asignados</span>
            <strong className="summary-card__value">{stats.total}</strong>
          </article>
          <article className="summary-card" style={{ background: "rgba(37, 99, 235, 0.08)", color: "#1d4ed8" }}>
            <span className="summary-card__title">Tutores activos</span>
            <strong className="summary-card__value">{stats.totalTutors}</strong>
          </article>
          <article className="summary-card" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#047857" }}>
            <span className="summary-card__title">Programas cubiertos</span>
            <strong className="summary-card__value">{stats.totalPrograms}</strong>
          </article>
        </div>

        {!selectedPeriod ? (
          <p className="empty-message">Seleccione un periodo academico para visualizar las asignaciones.</p>
        ) : (
          <>
            {assignmentsErrorMessage && <div className="alert alert--error">{assignmentsErrorMessage}</div>}
            <div className="table-wrapper">
              <table className="table table--compact">
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Programa</th>
                    <th>Tutor</th>
                    <th>Contacto</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isFetching ? (
                    <tr>
                      <td colSpan={5}>Cargando asignaciones...</td>
                    </tr>
                  ) : filteredAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No se encontraron asignaciones con el filtro aplicado.</td>
                    </tr>
                  ) : (
                    filteredAssignments.map((assignment) => (
                      <tr key={`assign-${assignment.id_estudiante}-${assignment.id_tutor ?? "none"}`}>
                        <td data-label="Estudiante">
                          <strong>{assignment.estudiante ?? "Sin nombre"}</strong>
                          <p className="field__hint">{assignment.dni ?? "Sin documento"}</p>
                        </td>
                        <td data-label="Programa">{assignment.programa ?? "Sin programa"}</td>
                        <td data-label="Tutor">
                          {assignment.tutor ?? "Sin tutor"}
                          {assignment.tutor_dni && <p className="field__hint">{assignment.tutor_dni}</p>}
                        </td>
                        <td data-label="Contacto">{assignment.tutor_correo ?? "Sin correo"}</td>
                        <td data-label="Acciones">
                          <button
                            type="button"
                            className="button button--ghost"
                            onClick={() => handleDashboardAssignmentSelect(assignment)}
                          >
                            Gestionar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="surface">
        <header className="section-header">
          <div>
            <h2 className="section-header__title">Registrar nueva asignacion</h2>
            <p className="section-header__subtitle">
              Busque estudiantes para asignarles un tutor en el periodo seleccionado, incluso si aun no tienen registro.
            </p>
          </div>
        </header>
        <div className="field__inline">
          <input
            type="text"
            className="field__control"
            placeholder="Ingrese DNI o nombre del estudiante"
            value={newAssignmentTerm}
            onChange={(event) => setNewAssignmentTerm(event.target.value)}
          />
          <button
            type="button"
            className="button button--secondary"
            onClick={handleStudentSearch}
            disabled={searchingNewAssignment}
          >
            {searchingNewAssignment ? "Buscando..." : "Buscar estudiante"}
          </button>
        </div>
        {newAssignmentError && <p className="field__hint field__hint--error">{newAssignmentError}</p>}
        {!newAssignmentError && !selectedPeriod && (
          <p className="field__hint field__hint--error">Seleccione un periodo para registrar la asignacion.</p>
        )}
        {newAssignmentResults.length > 0 && (
          <div className="student-search__results">
            {newAssignmentResults.map((student) => (
              <article key={`dashboard-${student.id_estudiante}`} className="student-search__result">
                <div>
                  <strong>{formatStudentDisplay(student)}</strong>
                  <p>{student.programa ?? "Sin programa"}</p>
                </div>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => handleDashboardStudentSelect(student)}
                >
                  Asignar tutor
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
