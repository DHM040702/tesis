import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { ApiTutoriasResponse, ApiUser, StudentItem, TutorAssignmentItem, TutorCatalogItem } from "../types";
import { useAuth } from "../context/AuthContext";
import { resolveDashboardVariant, type DashboardVariant } from "../utils/roles";
import { AssignTutorModal, mapAssignmentToTutorItem } from "../components/AssignTutorModal";
import { formatStudentDisplay } from "../utils/students";

const opcionesModalidad = [
  { value: 1, label: "Presencial" },
  { value: 2, label: "Virtual" },
  { value: 3, label: "Telefonica" }
];

type TutoriaForm = {
  id_estudiante?: number;
  id_periodo?: number;
  fecha_hora?: string;
  id_modalidad: number;
  tema: string;
  observaciones?: string;
  seguimiento?: string;
  id_tutor_override?: number;
};

export function TutoriasPage() {
  const { user } = useAuth();
  const variant = resolveDashboardVariant(user?.roles);

  if (variant === "student") {
    return <StudentTutoriasView user={user} />;
  }
  return <TutorManagementPage variant={variant} />;
}

function TutorManagementPage({ variant }: { variant: DashboardVariant }) {
  const queryClient = useQueryClient();
  const { data: periodos } = useQuery({ queryKey: ["periodos"], queryFn: () => apiClient.getPeriodos() });
  const { register, handleSubmit, reset, watch, setValue } = useForm<TutoriaForm>({
    defaultValues: {
      id_periodo: undefined,
      id_estudiante: undefined,
      fecha_hora: "",
      id_modalidad: 1,
      tema: "",
      observaciones: "",
      seguimiento: ""
    }
  });
  const isAdminView = variant === "admin";

  const rawPeriodo = watch("id_periodo");
  const rawEstudiante = watch("id_estudiante");
  const modalidadActual = watch("id_modalidad") ?? 1;
  const formCardClass = `surface form-card form-card--mod-${modalidadActual}`;
  const modalidadNombre = opcionesModalidad.find((opcion) => opcion.value === modalidadActual)?.label ?? "Presencial";
  const periodoSeleccionado = Number.isFinite(rawPeriodo) ? (rawPeriodo as number) : undefined;
  const estudianteSeleccionado = Number.isFinite(rawEstudiante) ? (rawEstudiante as number) : undefined;
  const [studentTerm, setStudentTerm] = useState("");
  const [studentResults, setStudentResults] = useState<StudentItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [searchingStudent, setSearchingStudent] = useState(false);
  const [studentSearchError, setStudentSearchError] = useState<string | null>(null);
  const [tutorTerm, setTutorTerm] = useState("");
  const [tutorResults, setTutorResults] = useState<TutorCatalogItem[]>([]);
  const [selectedTutor, setSelectedTutor] = useState<TutorCatalogItem | null>(null);
  const [searchingTutor, setSearchingTutor] = useState(false);
  const [tutorSearchError, setTutorSearchError] = useState<string | null>(null);
  const [isAssignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const openAssignmentModal = () => setAssignmentModalOpen(true);
  const closeAssignmentModal = () => setAssignmentModalOpen(false);

  useEffect(() => {
    if (!rawPeriodo && periodos?.length) {
      setValue("id_periodo", periodos[0].id_periodo, { shouldValidate: true });
    }
  }, [periodos, rawPeriodo, setValue]);

  const { data: tutorias = [] } = useQuery({
    queryKey: ["tutorias", periodoSeleccionado, estudianteSeleccionado],
    queryFn: () =>
      apiClient.getTutorias({
        id_periodo: periodoSeleccionado,
        id_estudiante: estudianteSeleccionado
      }),
    placeholderData: []
  });
  const { data: adminAssignments = [] } = useQuery<TutorAssignmentItem[]>({
    queryKey: ["tutor-assignments", periodoSeleccionado],
    queryFn: () => apiClient.getTutorAssignments(periodoSeleccionado),
    enabled: isAdminView && Boolean(periodoSeleccionado),
    placeholderData: []
  });
  const currentAssignment =
    isAdminView && selectedStudent
      ? adminAssignments.find((item) => item.id_estudiante === selectedStudent.id_estudiante)
      : undefined;
  const assignmentTutor = mapAssignmentToTutorItem(currentAssignment);
  useEffect(() => {
    if (!isAdminView) {
      setSelectedTutor(null);
      setTutorResults([]);
      setTutorSearchError(null);
      setTutorTerm("");
      return;
    }
    if (!selectedStudent) {
      setSelectedTutor(null);
      setTutorResults([]);
      setTutorSearchError(null);
      setTutorTerm("");
      return;
    }
    if (!selectedTutor && assignmentTutor) {
      setSelectedTutor(assignmentTutor);
    }
  }, [
    assignmentTutor?.correo,
    assignmentTutor?.dni,
    assignmentTutor?.id_tutor,
    assignmentTutor?.nombre,
    isAdminView,
    selectedStudent?.id_estudiante,
    selectedTutor
  ]);

  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const handleStudentSearch = async () => {
    const term = studentTerm.trim();
    if (!term) {
      setStudentSearchError("Ingrese un DNI o nombre.");
      setStudentResults([]);
      return;
    }
    setSearchingStudent(true);
    setStudentSearchError(null);
    try {
      const response = await apiClient.getStudents({ search: term, page: 1, pageSize: 10 });
      const items = response.items ?? [];
      setStudentResults(items);
      if (items.length === 0) {
        setStudentSearchError("No se encontraron estudiantes para el termino indicado.");
      }
    } catch (err) {
      setStudentResults([]);
      setStudentSearchError((err as Error).message);
    } finally {
      setSearchingStudent(false);
    }
  };

  const handleStudentSelect = (student: StudentItem) => {
    setSelectedStudent(student);
    setValue("id_estudiante", student.id_estudiante, { shouldValidate: true });
    setStudentSearchError(null);
    if (isAdminView) {
      setSelectedTutor(null);
      setTutorResults([]);
      setTutorSearchError(null);
      setTutorTerm("");
    }
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setValue("id_estudiante", undefined);
    setStudentSearchError(null);
    if (isAdminView) {
      setSelectedTutor(null);
      setTutorResults([]);
      setTutorSearchError(null);
      setTutorTerm("");
    }
  };

  const handleTutorSearch = async () => {
    if (!isAdminView) return;
    const term = tutorTerm.trim();
    if (!term) {
      setTutorSearchError("Ingrese un nombre o DNI para buscar.");
      setTutorResults([]);
      return;
    }
    if (!selectedStudent) {
      setTutorSearchError("Seleccione un estudiante antes de buscar docentes.");
      return;
    }
    if (!periodoSeleccionado) {
      setTutorSearchError("Seleccione un periodo académico antes de buscar docentes.");
      return;
    }
    setSearchingTutor(true);
    setTutorSearchError(null);
    try {
      const data = await apiClient.getTutors({ termino: term, limit: 10 });
      setTutorResults(data);
      if (data.length === 0) {
        setTutorSearchError("No se encontraron tutores para el término indicado.");
      }
    } catch (err) {
      setTutorSearchError((err as Error).message);
      setTutorResults([]);
    } finally {
      setSearchingTutor(false);
    }
  };

  const handleTutorSelect = (tutor: TutorCatalogItem) => {
    if (!isAdminView) return;
    setSelectedTutor(tutor);
    setTutorSearchError(null);
    setTutorResults([]);
    setTutorTerm("");
  };

  const handleClearTutor = () => {
    setSelectedTutor(null);
    setTutorSearchError(null);
    setTutorTerm("");
    setTutorResults([]);
  };

  const handleTutorAssigned = async ({ tutor, studentId }: { tutor: TutorCatalogItem; studentId: number }) => {
    if (selectedStudent?.id_estudiante === studentId) {
      setSelectedTutor(tutor);
    }
    await queryClient.invalidateQueries({ queryKey: ["tutor-assignments", periodoSeleccionado] });
    setAssignmentModalOpen(false);
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setMensaje(null);
    setEnviando(true);
    try {
      if (!values.id_periodo || !values.id_estudiante) {
        throw new Error("Debe seleccionar periodo y estudiante");
      }
      await apiClient.createTutoria({
        id_periodo: values.id_periodo,
        id_estudiante: values.id_estudiante,
        id_modalidad: values.id_modalidad,
        tema: values.tema,
        fecha_hora: values.fecha_hora || undefined,
        observaciones: values.observaciones || undefined,
        seguimiento: values.seguimiento || undefined,
        id_tutor_override: isAdminView ? selectedTutor?.id_tutor : undefined
      });
      setMensaje("Tutoria registrada correctamente");
      reset({
        id_modalidad: values.id_modalidad,
        tema: "",
        observaciones: "",
        seguimiento: "",
        fecha_hora: "",
        id_estudiante: undefined,
        id_periodo: values.id_periodo
      });
      setSelectedStudent(null);
      setStudentResults([]);
      setStudentTerm("");
      setStudentSearchError(null);
      queryClient.invalidateQueries({ queryKey: ["tutorias"] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  });

  return (
    <div className="page page--columns">
      {isAdminView && (
        <AssignTutorModal
          open={isAssignmentModalOpen}
          onClose={closeAssignmentModal}
          student={selectedStudent}
          periodo={periodoSeleccionado}
          currentAssignment={currentAssignment}
          onTutorAssigned={handleTutorAssigned}
        />
      )}
      <section className={formCardClass}>
        <header className="page__header page__header--compact">
          <h1 className="page__title">Registro de tutor?a</h1>
          <p className="page__subtitle">Complete el formulario para registrar la atenci?n brindada al estudiante.</p>
          <span className="section-header__meta">Modalidad Seleccionada: {modalidadNombre}</span>
        </header>
        <form onSubmit={onSubmit} className="form-grid">
          <input type="hidden" {...register("id_estudiante", { valueAsNumber: true, required: true })} />
          <label className="field">
            <span className="field__label">Periodo acad?mico</span>
            <select {...register("id_periodo", { valueAsNumber: true, required: true })} className="field__control">
              <option value="">Seleccione un periodo</option>
              {periodos?.map((periodo) => (
                <option key={periodo.id_periodo} value={periodo.id_periodo}>
                  {periodo.nombre}
                </option>
              ))}
            </select>
          </label>
          <div className="field field--full student-search">
            <label className="field__label" htmlFor="student-search-input">
              Estudiante
            </label>
            <div className="student-search__controls">
              <input
                id="student-search-input"
                type="text"
                className="field__control"
                placeholder="Ingrese DNI o nombre del estudiante"
                value={studentTerm}
                onChange={(event) => setStudentTerm(event.target.value)}
              />
              <button type="button" className="button button--ghost" onClick={handleStudentSearch} disabled={searchingStudent}>
                {searchingStudent ? "Buscando..." : "Buscar"}
              </button>
            </div>
            {studentSearchError && <p className="field__hint field__hint--error">{studentSearchError}</p>}
            {!studentSearchError && !selectedStudent && <p className="field__hint">Seleccione un estudiante para habilitar el registro.</p>}
          </div>

          {selectedStudent && (
            <div className="student-search__selection field field--full">
              <div>
                <strong>{formatStudentDisplay(selectedStudent)}</strong>
                <p>{selectedStudent.programa ?? "Sin programa"}</p>
                {selectedStudent.nivel && <span className="badge">{selectedStudent.nivel}</span>}
              </div>
              <button type="button" className="button button--ghost" onClick={handleClearStudent}>
                Cambiar
              </button>
            </div>
          )}

          {isAdminView && selectedStudent && (
            <>
              <div className="field field--full admin-assignment-banner">
                <div>
                  <span className="field__label">Asignación de tutor</span>
                  <p className="field__hint">
                    {assignmentTutor
                      ? `Actualmente asignado: ${assignmentTutor.nombre ?? "Tutor sin nombre"}.`
                      : "El estudiante no tiene un tutor asignado en el periodo seleccionado."}
                  </p>
                  {!periodoSeleccionado && (
                    <p className="field__hint field__hint--error">
                      Seleccione un periodo académico para gestionar la asignación.
                    </p>
                  )}
                </div>
                <div className="admin-assignment-banner__actions">
                  {currentAssignment?.periodo && <span className="badge">{currentAssignment.periodo}</span>}
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={openAssignmentModal}
                    disabled={!periodoSeleccionado}
                  >
                    Gestionar asignación
                  </button>
                </div>
              </div>

              <div className="field field--full tutor-picker">
                <div className="tutor-picker__header">
                  <span className="field__label">Docente responsable de esta sesión</span>
                  <p className="field__hint">
                    Use este buscador para registrar la sesión con un docente específico. Si no selecciona uno se usará
                    la asignación vigente.
                  </p>
                </div>
                {selectedTutor ? (
                  <div className="tutor-picker__selection">
                    <div>
                      <strong>{selectedTutor.nombre ?? "Tutor sin nombre"}</strong>
                      <p className="field__hint">
                        {selectedTutor.dni ? `${selectedTutor.dni} · ` : ""}
                        {selectedTutor.correo ?? "Sin correo"}
                      </p>
                    </div>
                    <button type="button" className="button button--ghost" onClick={handleClearTutor}>
                      Quitar
                    </button>
                  </div>
                ) : (
                  <p className="field__hint">
                    {assignmentTutor
                      ? `Se usará ${assignmentTutor.nombre ?? "el tutor asignado"} si no realiza cambios.`
                      : "Asigne un tutor al estudiante o busque un docente para registrar esta sesión."}
                  </p>
                )}
                <div className="field__inline tutor-picker__controls">
                  <input
                    type="text"
                    className="field__control"
                    placeholder="Buscar por nombre o DNI"
                    value={tutorTerm}
                    onChange={(event) => setTutorTerm(event.target.value)}
                    disabled={!periodoSeleccionado || !selectedStudent}
                  />
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={handleTutorSearch}
                    disabled={!periodoSeleccionado || !selectedStudent || searchingTutor}
                  >
                    {searchingTutor ? "Buscando..." : "Buscar docentes"}
                  </button>
                </div>
                {tutorSearchError && <p className="field__hint field__hint--error">{tutorSearchError}</p>}

                {tutorResults.length > 0 && !selectedTutor && (
                  <div className="tutor-picker__results">
                    {tutorResults.map((tutor) => (
                      <article key={tutor.id_tutor} className="tutor-picker__result">
                        <div>
                          <strong>{tutor.nombre ?? "Tutor sin nombre"}</strong>
                          <p className="field__hint">
                            {tutor.dni ? `${tutor.dni} · ` : ""}
                            {tutor.correo ?? "Sin correo"}
                          </p>
                        </div>
                        <button type="button" className="button button--primary" onClick={() => handleTutorSelect(tutor)}>
                          Usar en esta sesión
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {studentResults.length > 0 && !selectedStudent && (
            <div className="student-search__results field field--full">
              {studentResults.map((student) => (
                <article key={student.id_estudiante} className="student-search__result">
                  <div>
                    <strong>{formatStudentDisplay(student)}</strong>
                    <p>{student.programa ?? "Sin programa"}</p>
                    {student.nivel && <span className="badge">{student.nivel}</span>}
                  </div>
                  <button type="button" className="button button--primary" onClick={() => handleStudentSelect(student)}>
                    Seleccionar
                  </button>
                </article>
              ))}
            </div>
          )}
          <label className="field">
            <span className="field__label">Fecha y hora</span>
            <input type="datetime-local" {...register("fecha_hora")} className="field__control" />
          </label>
          <label className="field">
            <span className="field__label">Modalidad</span>
            <select {...register("id_modalidad", { valueAsNumber: true, required: true })} className="field__control">
              {opcionesModalidad.map((opcion) => (
                <option key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field field--full">
            <span className="field__label">Tema tratado</span>
            <input type="text" {...register("tema", { required: true, minLength: 3 })} className="field__control" />
          </label>
          <label className="field field--full">
            <span className="field__label">Observaciones</span>
            <textarea
              {...register("observaciones")}
              className="field__control field__control--textarea"
              rows={3}
            />
          </label>
          <label className="field field--full">
            <span className="field__label">Seguimiento sugerido</span>
            <textarea {...register("seguimiento")} className="field__control field__control--textarea" rows={3} />
          </label>

          {mensaje && <div className="alert alert--success field--full">{mensaje}</div>}
          {error && <div className="alert alert--error field--full">{error}</div>}

          <div className="form-actions field--full">
            <button type="submit" disabled={enviando} className="button button--primary">
              {enviando ? "Guardando..." : "Registrar tutor?a"}
            </button>
          </div>
        </form>
      </section>

      <section className="surface">
        <header className="section-header">
          <div>
            <h2 className="section-header__title">Historial reciente</h2>
            <p className="section-header__subtitle">Filtre por periodo y estudiante para visualizar las sesiones registradas.</p>
          </div>
        </header>
        <div className="timeline">
          {tutorias?.map((tutoria) => (
            <TimelineItem key={tutoria.id_tutoria} tutoria={tutoria} />
          ))}
        </div>
        {tutorias && tutorias.length === 0 && <p className="empty-message">Registre una tutor?a para visualizarla aqu?.</p>}
      </section>
    </div>
  );
}

function StudentTutoriasView({ user }: { user: ApiUser | null }) {
  const firstName = (user?.persona?.nombres ?? user?.correo ?? "Estudiante").split(" ")[0];
  const supportEmail = "soporte@unasam.edu.pe";
  const reminders = [
    { title: "Coordina tu agenda", description: "Confirma con tu tutor las fechas pactadas y actualiza tus compromisos en un calendario personal." },
    { title: "Revisa tus acuerdos", description: "Luego de cada sesi?n, valida que los acuerdos y compromisos queden registrados por tu tutor." },
    { title: "Pide ayuda a tiempo", description: "Si detectas nuevas alertas acad?micas o personales, notif?calo para recibir apoyo oportuno." }
  ];

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">Mis tutor?as</h1>
        <p className="page__subtitle">Consulta el estado del acompa?amiento registrado por tu tutor.</p>
      </header>

      <section className="surface hero-card">
        <div className="hero-card__stats">
          <div>
            <p className="page__subtitle">Panel del estudiante</p>
            <h2 className="hero-card__headline">Hola, {firstName}</h2>
            <p className="hero-card__copy">Tus tutor?as ser?n registradas por tu tutor. Aqu? ver?s un resumen cuando existan sesiones publicadas.</p>
          </div>
          <div className="hero-card__actions">
            <Link to="/" className="button button--ghost">
              Ir al resumen
            </Link>
            <a className="button button--primary" href={`mailto:${supportEmail}`}>
              Contactar soporte
            </a>
          </div>
        </div>
      </section>

      <section className="surface">
        <header className="section-header">
          <div>
            <h2 className="section-header__title">Historial de tutor?as</h2>
            <p className="section-header__subtitle">Solicita a tu tutor que confirme los registros despu?s de cada encuentro.</p>
          </div>
        </header>
        <p className="empty-message">
          A?n no hay tutor?as visibles desde tu perfil. Comun?cate con tu tutor si necesitas una constancia del seguimiento.
        </p>
      </section>

      <section className="summary-grid">
        {reminders.map((item) => (
          <article key={item.title} className="summary-card" style={{ background: "rgba(255, 255, 255, 0.95)", color: "#1f2937" }}>
            <span className="summary-card__title">{item.title}</span>
            <p className="stat-card__description">{item.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

function TimelineItem({ tutoria }: { tutoria: ApiTutoriasResponse }) {
  return (
    <article className="timeline__item">
      <h3 className="timeline__title">{tutoria.tema}</h3>
      <div className="timeline__meta">
        <span>{formatearFecha(tutoria.fecha_hora)}</span>
        <span>{tutoria.estudiante}</span>
        <span>{tutoria.periodo}</span>
        <span>Tutor: {tutoria.tutor}</span>
      </div>
      <p className="timeline__body">{tutoria.observaciones ?? "Sin observaciones registradas."}</p>
      {tutoria.seguimiento && (
        <p className="timeline__body">
          <strong>Seguimiento:</strong> {tutoria.seguimiento}
        </p>
      )}
    </article>
  );
}

function formatearFecha(fecha?: string) {
  if (!fecha) return "-";
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
