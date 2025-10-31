export type ApiResponse<T> = {
  ok: boolean;
  data: T;
  message?: string;
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
  puntaje: number;
  nivel: string;
  factores_json: string | null;
  creado_en: string;
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
  puntaje?: number;
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