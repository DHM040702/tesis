
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