import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { ApiTutoriasResponse, StudentItem } from "../types";

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
      reset({ id_modalidad: 1, tema: "", observaciones: "", seguimiento: "", fecha_hora: "", id_estudiante: undefined, id_periodo: values.id_periodo });
      queryClient.invalidateQueries({ queryKey: ["tutorias"] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
      <section style={panelStyle}>
        <header>
          <h1 style={{ margin: 0 }}>Registro de tutorías</h1>
          <p style={{ color: "#6b7280" }}>
            Complete el formulario para registrar la atención brindada al estudiante.
          </p>
        </header>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gap: "12px" }}>
            <label style={labelStyle}>
              <span>Periodo académico</span>
              <select {...register("id_periodo", { valueAsNumber: true, required: true })} style={selectStyle}>
                <option value="">Seleccione un periodo</option>
                {periodos?.map((periodo) => (
                  <option key={periodo.id_periodo} value={periodo.id_periodo}>
                    {periodo.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              <span>Estudiante asignado</span>
              <select {...register("id_estudiante", { valueAsNumber: true, required: true })} style={selectStyle}>
                <option value="">Seleccione un estudiante</option>
                {asignados?.map((est) => (
                  <option key={est.id_estudiante} value={est.id_estudiante}>
                    {formatearNombreEstudiante(est)}
                  </option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              <span>Fecha y hora</span>
              <input type="datetime-local" {...register("fecha_hora")} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span>Modalidad</span>
              <select {...register("id_modalidad", { valueAsNumber: true, required: true })} style={selectStyle}>
                {opcionesModalidad.map((opcion) => (
                  <option key={opcion.value} value={opcion.value}>
                    {opcion.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              <span>Tema tratado</span>
              <input type="text" {...register("tema", { required: true, minLength: 3 })} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span>Observaciones</span>
              <textarea {...register("observaciones")} style={textareaStyle} rows={3} />
            </label>
            <label style={labelStyle}>
              <span>Seguimiento sugerido</span>
              <textarea {...register("seguimiento")} style={textareaStyle} rows={3} />
            </label>
          </div>
          {mensaje && <div style={{ color: "#22c55e", fontWeight: 600 }}>{mensaje}</div>}
          {error && <div style={{ color: "#ef4444" }}>{error}</div>}
          <button type="submit" disabled={enviando} style={submitButton}>
            {enviando ? "Guardando..." : "Registrar tutoría"}
          </button>
        </form>
      </section>

      <section style={panelStyle}>
        <header style={{ marginBottom: "16px" }}>
          <h2 style={{ margin: 0 }}>Historial reciente</h2>
          <p style={{ color: "#6b7280" }}>
            Filtre por periodo y estudiante para visualizar las sesiones registradas.
          </p>
        </header>
        <div className="table-scroll">
          <table style={tablaStyle}>
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
          <p style={{ color: "#6b7280", textAlign: "center", marginTop: "16px" }}>
            Registre una tutoría para visualizarla aquí.
          </p>
        )}
      </section>
    </div>
  );
}

function formatearNombreEstudiante(estudiante: StudentItem) {
  const partes = [estudiante.apellido_paterno, estudiante.apellido_materno, estudiante.nombres]
    .filter(Boolean)
    .join(" ");
  return `${estudiante.dni ?? ""} · ${partes}`;
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

const panelStyle: React.CSSProperties = {
  background: "#fff",
  padding: "24px",
  borderRadius: "12px",
  boxShadow: "0 12px 24px rgba(15, 23, 42, 0.05)",
  display: "flex",
  flexDirection: "column",
  gap: "16px"
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontSize: "0.95rem"
};

const selectStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db"
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db"
};

const textareaStyle: React.CSSProperties = {
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  resize: "vertical"
};

const submitButton: React.CSSProperties = {
  padding: "12px",
  borderRadius: "10px",
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer"
};

const tablaStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "680px"
};