import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { ApiTutoriasResponse, StudentItem, TutorAssignmentItem } from "../types";

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
        id_modalidad: 1,
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
      <section className="surface">
        <header className="page__header page__header--compact">
          <h1 className="page__title">Registro de tutorías</h1>
          <p className="page__subtitle">Complete el formulario para registrar la atención brindada al estudiante.</p>
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
        <div className="table-scroll">
          <table className="table table--sm">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Estudiante</th>
                <th>Tema</th>
                <th>Periodo</th>
                <th>Seguimiento</th>
              </tr>
            </thead>
            <tbody>
              {tutorias?.map((tutoria) => (
                <FilaTutoria key={tutoria.id_tutoria} tutoria={tutoria} />
              ))}
            </tbody>
          </table>
        </div>
        {tutorias && tutorias.length === 0 && (
          <p className="empty-message">Registre una tutoría para visualizarla aquí.</p>
        )}
      </section>
    </div>
  );
}

type AsignadoEstudiante = StudentItem & { estudiante?: string | null };

function formatearNombreEstudiante(estudiante: AsignadoEstudiante) {
  if (estudiante.estudiante) {
    const nombre = estudiante.estudiante.trim();
    return `${estudiante.dni ?? ""}${nombre ? ` · ${nombre}` : ""}`;
  }

  const partes = [estudiante.apellido_paterno, estudiante.apellido_materno, estudiante.nombres]
    .filter(Boolean)
    .join(" ")
    .trim();
  const nombreVisible = partes || "Sin nombre";
  const prefijo = estudiante.dni ? `${estudiante.dni} · ` : "";
  return `${prefijo}${nombreVisible}`;
}

function FilaTutoria({ tutoria }: { tutoria: ApiTutoriasResponse }) {
  return (
    <tr>
      <td>{new Date(tutoria.fecha_hora).toLocaleString()}</td>
      <td>{tutoria.estudiante}</td>
      <td>{tutoria.tema}</td>
      <td>{tutoria.periodo}</td>
      <td>{tutoria.seguimiento ?? "-"}</td>
    </tr>
  );
}
