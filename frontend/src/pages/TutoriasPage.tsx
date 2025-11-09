import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { ApiTutoriasResponse, StudentItem, TutorAssignmentItem } from "../types";

const opcionesModalidad = [
  { value: 1, label: "Presencial" },
  { value: 2, label: "Virtual" },
  { value: 3, label: "Telef��nica" }
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
      setMensaje("Tutor��a registrada correctamente");
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
          <h1 className="page__title">Registro de tutor��as</h1>
          <p className="page__subtitle">Complete el formulario para registrar la atenci��n brindada al estudiante.</p>
          <span className="section-header__meta">Modalidad seleccionada: {modalidadNombre}</span>
        </header>
        <form onSubmit={onSubmit} className="form-grid">
          <label className="field">
            <span className="field__label">Periodo acadǸmico</span>
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
              {enviando ? "Guardando..." : "Registrar tutor��a"}
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
        {tutorias && tutorias.length === 0 && <p className="empty-message">Registre una tutor��a para visualizarla aqu��.</p>}
      </section>
    </div>
  );
}

type AsignadoEstudiante = StudentItem & { estudiante?: string | null };

function formatearNombreEstudiante(estudiante: AsignadoEstudiante) {
  if (estudiante.estudiante) {
    const nombre = estudiante.estudiante.trim();
    return `${estudiante.dni ?? ""}${nombre ? ` �� ${nombre}` : ""}`;
  }

  const partes = [estudiante.apellido_paterno, estudiante.apellido_materno, estudiante.nombres]
    .filter(Boolean)
    .join(" ")
    .trim();
  const nombreVisible = partes || "Sin nombre";
  const prefijo = estudiante.dni ? `${estudiante.dni} �� ` : "";
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
