
export type ApiResponse<T> = {
  ok: boolean;
  data: T;
  message?: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type ApiLoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user?: ApiUser | null;
};

export type ApiUser = {
  id_usuario: number;
  correo: string;
  estado: string;
  roles: string[];
  persona?: {
    dni?: string;
    apellido_paterno?: string;
    apellido_materno?: string;
    nombres?: string;
  };
};

export type RiskSummaryItem = {
  id_estudiante: number;
  dni: string;
  nombre_visible: string;
  id_programa: number;
  programa: string;
  puntaje: number | string | null;
  nivel: string;
  factores_json: string | null;
  creado_en: string;
};

export type ProgramItem = {
  id_programa: number;
  nombre: string;
};

export type PeriodoItem = {
  id_periodo: number;
  nombre: string;
};

export type RiskLevelItem = {
  id_nivel_riesgo: number;
  nombre: string;
  descripcion?: string | null;
  color?: string | null;
};

export type TutorAssignmentItem = {
  id_estudiante: number;
  dni: string | null;
  estudiante: string;
  programa: string;
  periodo: string;
  id_tutor?: number;
  tutor?: string | null;
  tutor_dni?: string | null;
  tutor_correo?: string | null;
};

export type StudentItem = {
  id_estudiante: number;
  codigo_alumno?: string;
  dni?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  nombres?: string;
  programa?: string;
  periodo?: string;
  puntaje?: number | string | null;
  nivel?: string;
};

export type ApiTutoriasResponse = {
  id_tutoria: number;
  id_estudiante: number;
  dni: string;
  estudiante: string;
  periodo: string;
  fecha_hora: string;
  tema: string;
  observaciones?: string;
  seguimiento?: string;
  tutor: string;
};

export type TutorCatalogItem = {
  id_tutor: number;
  id_usuario?: number;
  nombre: string | null;
  dni?: string | null;
  correo?: string | null;
};

export type StudentSelfSummary = {
  estudiante: {
    id_estudiante: number;
    codigo_alumno?: string | null;
    id_programa?: number | null;
    programa?: string | null;
    dni?: string | null;
    apellido_paterno?: string | null;
    apellido_materno?: string | null;
    nombres?: string | null;
  } | null;
  riesgo_actual: {
    id_periodo?: number | null;
    periodo?: string | null;
    puntaje?: number | null;
    nivel?: string | null;
    descripcion?: string | null;
    actualizado_en?: string | null;
  } | null;
  periodos_disponibles: Array<{
    id_periodo: number;
    nombre: string;
  }>;
  periodo_sugerido?: number | null;
};

export type StudentGradesResponse = {
  detalle: Array<{
    curso: string;
    creditos: number | null;
    nota_final: number | null;
    estado: string | null;
  }>;
  promedio_general: number | null;
  resumen: {
    aprobados: number;
    desaprobados: number;
    pendientes: number;
  };
};

export type DropoutPredictionRequest = {
  promedio: number;
  asistencia: number;
  cursos_matriculados: number;
  cursos_desaprobados: number;
};

export type DropoutPredictionResult = {
  prediccion: number;
  probabilidad: number;
  nivel: string;
};

export type StudentMatricula = {
  id_matricula: number;
  curso: string;
  creditos: number | null;
  docente?: string | null;
  estado_matricula?: string | null;
  fecha_matricula?: string | null;
};

export type StudentAttendanceSummary = {
  curso: string;
  asistencias: number | null;
  faltas: number | null;
  total_sesiones: number | null;
  porcentaje_asistencia: number | null;
};

export type AcademicGradesResponse = {
  detalle: Array<{
    curso: string;
    creditos: number | null;
    nota_final: number | null;
    estado: string | null;
  }>;
  promedio_general: number | null;
};
