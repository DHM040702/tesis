import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { ApiTutoriasResponse, ApiUser, StudentItem } from "../types";
import { useAuth } from "../context/AuthContext";
import { resolveDashboardVariant } from "../utils/roles";

const opcionesModalidad = [
  { value: 1, label: "Presencial" },
  { value: 2, label: "Virtual" },
  { value: 3, label: "Telefónica" }
];

type TutoriaForm = {
  id_estudiante?: number;
  id_periodo?: number;
  fecha_hora?: string;
  id_modalidad: number;
  tema: string;
  observaciones?: string;
  seguimiento?: string;
};

export function TutoriasPage() {
  const { user } = useAuth();
  const variant = resolveDashboardVariant(user?.roles);

  if (variant === "student") {
    return <StudentTutoriasView user={user} />;
  }
  return <TutorManagementPage />;
}

function TutorManagementPage() {
  const queryClient = useQueryClient();
  const { data: periodos } = useQuery({ queryKey: ["periodos"], queryFn: () => apiClient.getPeriodos() });
  const { register, handleSubmit, reset, watch } = useForm<TutoriaForm>({
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

  const rawPeriodo = watch("id_periodo");
  const rawEstudiante = watch("id_estudiante");
  const modalidadActual = watch("id_modalidad") ?? 1;
  const formCardClass = `surface form-card form-card--mod-${modalidadActual}`;
  const modalidadNombre = opcionesModalidad.find((opcion) => opcion.value === modalidadActual)?.label ?? "Presencial";
  const periodoSeleccionado = Number.isFinite(rawPeriodo) ? (rawPeriodo as number) : undefined;
  const estudianteSeleccionado = Number.isFinite(rawEstudiante) ? (rawEstudiante as number) : undefined;

  const { data: asignados } = useQuery({
    queryKey: ["asignados", periodoSeleccionado],
    queryFn: () => apiClient.getTutorAssignments(periodoSeleccionado),
    placeholderData: []
  });

  const { data: tutorias } = useQuery({
    queryKey: ["tutorias", periodoSeleccionado, estudianteSeleccionado],
    queryFn: () =>
      apiClient.getTutorias({
        id_periodo: periodoSeleccionado,
        id_estudiante: estudianteSeleccionado
      }),
    placeholderData: []
  });

  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!periodoSeleccionado) {
      queryClient.invalidateQueries({ queryKey: ["asignados"] });
    }
  }, [periodoSeleccionado, queryClient]);

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
        seguimiento: values.seguimiento || undefined
      });
      setMensaje("Tutoría registrada correctamente");
      reset({
        id_modalidad: values.id_modalidad,
        tema: "",
        observaciones: "",
        seguimiento: "",
        fecha_hora: "",
        id_estudiante: undefined,
        id_periodo: values.id_periodo
      });
      queryClient.invalidateQueries({ queryKey: ["tutorias"] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  });

  return (
    <div className="page page--columns">
      <section className={formCardClass}>
        <header className="page__header page__header--compact">
          <h1 className="page__title">Registro de tutoría</h1>
          <p className="page__subtitle">Complete el formulario para registrar la atención brindada al estudiante.</p>
          <span className="section-header__meta">Modalidad seleccionada: {modalidadNombre}</span>
        </header>
        <form onSubmit={onSubmit} className="form-grid">
          <label className="field">
            <span className="field__label">Periodo académico</span>
            <select {...register("id_periodo", { valueAsNumber: true, required: true })} className="field__control">
              <option value="">Seleccione un periodo</option>
              {periodos?.map((periodo) => (
                <option key={periodo.id_periodo} value={periodo.id_periodo}>
                  {periodo.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Estudiante asignado</span>
            <select {...register("id_estudiante", { valueAsNumber: true, required: true })} className="field__control">
              <option value="">Seleccione un estudiante</option>
              {asignados?.map((est) => (
                <option key={est.id_estudiante} value={est.id_estudiante}>
                  {formatearNombreEstudiante(est)}
                </option>
              ))}
            </select>
          </label>
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
            <textarea {...register("observaciones")} className="field__control field__control--textarea" rows={3} />
          </label>
          <label className="field field--full">
            <span className="field__label">Seguimiento sugerido</span>
            <textarea {...register("seguimiento")} className="field__control field__control--textarea" rows={3} />
          </label>

          {mensaje && <div className="alert alert--success field--full">{mensaje}</div>}
          {error && <div className="alert alert--error field--full">{error}</div>}

          <div className="form-actions field--full">
            <button type="submit" disabled={enviando} className="button button--primary">
              {enviando ? "Guardando..." : "Registrar tutoría"}
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
        {tutorias && tutorias.length === 0 && <p className="empty-message">Registre una tutoría para visualizarla aquí.</p>}
      </section>
    </div>
  );
}

function StudentTutoriasView({ user }: { user: ApiUser | null }) {
  const firstName = (user?.persona?.nombres ?? user?.correo ?? "Estudiante").split(" ")[0];
  const supportEmail = "soporte@unasam.edu.pe";
  const reminders = [
    { title: "Coordina tu agenda", description: "Confirma con tu tutor las fechas pactadas y actualiza tus compromisos en un calendario personal." },
    { title: "Revisa tus acuerdos", description: "Luego de cada sesión, valida que los acuerdos y compromisos queden registrados por tu tutor." },
    { title: "Pide ayuda a tiempo", description: "Si detectas nuevas alertas académicas o personales, notifícalo para recibir apoyo oportuno." }
  ];

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">Mis tutorías</h1>
        <p className="page__subtitle">Consulta el estado del acompañamiento registrado por tu tutor.</p>
      </header>

      <section className="surface hero-card">
        <div className="hero-card__stats">
          <div>
            <p className="page__subtitle">Panel del estudiante</p>
            <h2 className="hero-card__headline">Hola, {firstName}</h2>
            <p className="hero-card__copy">Tus tutorías serán registradas por tu tutor. Aquí verás un resumen cuando existan sesiones publicadas.</p>
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
            <h2 className="section-header__title">Historial de tutorías</h2>
            <p className="section-header__subtitle">Solicita a tu tutor que confirme los registros después de cada encuentro.</p>
          </div>
        </header>
        <p className="empty-message">
          Aún no hay tutorías visibles desde tu perfil. Comunícate con tu tutor si necesitas una constancia del seguimiento.
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

type AsignadoEstudiante = StudentItem & { estudiante?: string | null };

function formatearNombreEstudiante(estudiante: AsignadoEstudiante) {
  if (estudiante.estudiante) {
    const nombre = estudiante.estudiante.trim();
    return `${estudiante.dni ?? ""}${nombre ? ` ´┐¢´┐¢ ${nombre}` : ""}`;
  }

  const partes = [estudiante.apellido_paterno, estudiante.apellido_materno, estudiante.nombres]
    .filter(Boolean)
    .join(" ")
    .trim();
  const nombreVisible = partes || "Sin nombre";
  const prefijo = estudiante.dni ? `${estudiante.dni} ´┐¢´┐¢ ` : "";
  return `${prefijo}${nombreVisible}`;
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
