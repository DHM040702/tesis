import dayjs from "dayjs";
import {
  AcademicGradesResponse,
  ApiLoginResponse,
  ApiResponse,
  ApiTutoriasResponse,
  ApiUser,
  DropoutPredictionRequest,
  DropoutPredictionResult,
  PaginatedResponse,
  PeriodoItem,
  ProgramItem,
  RiskLevelItem,
  RiskSummaryItem,
  StudentAttendanceSummary,
  StudentGradesResponse,
  StudentItem,
  StudentMatricula,
  StudentSelfSummary,
  TutorAssignmentItem,
  TutorCatalogItem
} from "../types";

const RAW_API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const API_URL = RAW_API_URL.replace(/\/+$/, "");

type Tokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

type Programa = { id_programa: number; nombre: string };
type NivelRiesgo = { id_nivel_riesgo: number; nombre: string; descripcion?: string };
type TutorAssignment = Pick<StudentItem, "id_estudiante" | "dni" | "programa" | "periodo"> & {
  estudiante?: string | null;
  id_tutor?: number;
  tutor?: string | null;
  tutor_dni?: string | null;
  tutor_correo?: string | null;
};

type CreateTutoriaPayload = {
  id_estudiante: number;
  id_periodo: number;
  id_modalidad: number;
  tema: string;
  fecha_hora?: string;
  observaciones?: string;
  seguimiento?: string;
  id_tutor_override?: number;
};


type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  path: string;
  init?: RequestInit;
};

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private queue: PendingRequest[] = [];

  setTokens(tokens: Tokens) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
  }

  private buildUrl(path: string): string {
    if (!path.startsWith("/")) {
      return `${API_URL}/${path}`;
    }
    return `${API_URL}${path}`;
  }

  private async parseErrorResponse(response: Response, fallback = "Error al comunicarse con el servidor"): Promise<string> {
    const text = await response.text();
    if (!text) {
      return fallback;
    }
    try {
      const data = JSON.parse(text);
      if (typeof data.detail === "string") {
        return data.detail;
      }
      if (typeof data.message === "string") {
        return data.message;
      }
    } catch {
      // ignorar: no es JSON válido, usar texto plano
    }
    return text;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const targetUrl = this.buildUrl(path);
    const headers = new Headers(init?.headers ?? {});
    headers.set("Content-Type", "application/json");
    if (this.accessToken) {
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    }
    let response: Response;
    try {
      response = await fetch(targetUrl, {
        ...init,
        headers
      });
    } catch {
      throw new Error(
        `No se pudo conectar con la API (${targetUrl}). Verifique la URL configurada y las reglas CORS.`
      );
    }

    if (response.status === 401 && this.refreshToken) {
      return this.handleUnauthorized<T>(path, init);
    }

    if (!response.ok) {
      const message = await this.parseErrorResponse(response);
      throw new Error(message);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return response.json();
  }

  private async handleUnauthorized<T>(path: string, init?: RequestInit): Promise<T> {
    if (!this.refreshToken) {
      throw new Error("Sesión expirada");
    }

    if (this.isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        this.queue.push({ resolve, reject, path, init });
      });
    }

    this.isRefreshing = true;
    try {
      let res: Response;
      const targetUrl = this.buildUrl("/auth/refresh");
      try {
        res = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: this.refreshToken })
        });
      } catch {
        throw new Error(
          `No se pudo conectar con la API (${targetUrl}). Verifique la URL configurada y las reglas CORS.`
        );
      }
      if (!res.ok) {
        const message = await this.parseErrorResponse(res, "No se pudo refrescar la sesión");
        throw new Error(message);
      }
      const tokens: ApiLoginResponse = await res.json();
      this.accessToken = tokens.access_token;
      this.refreshToken = tokens.refresh_token;
      localStorage.setItem("sia_access", tokens.access_token);
      localStorage.setItem("sia_refresh", tokens.refresh_token);
      const data = await this.request<T>(path, init);
      this.flushQueue();
      return data;
    } catch (error) {
      this.resetTokens();
      this.flushQueue(error);
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  async login(payload: { correo: string; contrasenia: string }): Promise<ApiLoginResponse> {
    let res: Response;
    const targetUrl = this.buildUrl("/auth/login");
    try {
      res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ correo: payload.correo, contrasenia: payload.contrasenia })
      });
    } catch {
      throw new Error(
        `No se pudo conectar con la API (${targetUrl}). Verifique la URL configurada y las reglas CORS.`
      );
    }
    if (!res.ok) {
      const message = await this.parseErrorResponse(res, "Credenciales incorrectas");
      throw new Error(message);
    }
    const data: ApiLoginResponse = await res.json();
    this.setTokens({ accessToken: data.access_token, refreshToken: data.refresh_token });
    return data;
  }

  async logout(refreshToken: string) {
    let res: Response;
    const targetUrl = this.buildUrl("/auth/logout");
    try {
      res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
    } catch {
      throw new Error(
        `No se pudo conectar con la API (${targetUrl}). Verifique la URL configurada y las reglas CORS.`
      );
    }
    if (!res.ok) {
      const message = await this.parseErrorResponse(res);
      throw new Error(message);
    }
  }

  async getMe(): Promise<ApiUser> {
    const res = await this.request<ApiResponse<ApiUser>>("/usuarios/me");
    if (!res.ok || !res.data) {
      throw new Error("No se pudo cargar el perfil");
    }
    return res.data;
  }

  async getRiskSummary(params: { id_periodo: number; id_programa?: number }): Promise<RiskSummaryItem[]> {
    const query = new URLSearchParams({ id_periodo: String(params.id_periodo) });
    if (params.id_programa) {
      query.append("id_programa", String(params.id_programa));
    }
    const res = await this.request<ApiResponse<RiskSummaryItem[]>>(`/riesgo/resumen?${query.toString()}`);
    return res.data ?? [];
  }

  async getPeriodos(): Promise<PeriodoItem[]> {
    const res = await this.request<ApiResponse<PeriodoItem[]>>("/catalogos/periodos");
    return res.data ?? [];
  }

  async getProgramas(): Promise<Programa[]> {
    const res = await this.request<ApiResponse<Programa[]>>("/catalogos/programas");
    return res.data ?? [];
  }

  async getNivelesRiesgo(): Promise<NivelRiesgo[]> {
    const res = await this.request<ApiResponse<NivelRiesgo[]>>("/catalogos/niveles-riesgo");
    return res.data ?? [];
  }

  async getStudents(params: {
    programa?: number;
    periodo?: number;
    riesgo?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<StudentItem>> {
    const query = new URLSearchParams();
    if (params.programa) {
      query.append("programa", String(params.programa));
    }
    if (params.periodo) {
      query.append("periodo", String(params.periodo));
    }
    if (params.riesgo) {
      query.append("riesgo", params.riesgo);
    }
    if (params.search && params.search.trim()) {
      query.append("termino", params.search.trim());
    }
    if (params.page) {
      query.append("page", String(params.page));
    }
    if (params.pageSize) {
      query.append("page_size", String(params.pageSize));
    }
    const search = query.toString();
    const endpoint = search ? `/estudiantes?${search}` : "/estudiantes";
    const res = await this.request<ApiResponse<{
      items?: StudentItem[];
      total?: number;
      page?: number;
      page_size?: number;
    }>>(endpoint);
    const fallbackPage = params.page ?? 1;
    const fallbackPageSize = params.pageSize ?? 20;
    const data = res.data ?? {};
    return {
      items: data.items ?? [],
      total: data.total ?? 0,
      page: data.page ?? fallbackPage,
      pageSize: data.page_size ?? fallbackPageSize
    };
  }

  async searchStudentsByCode(params: { codigo: string; max_alumnos?: number }): Promise<StudentItem[]> {
    const query = new URLSearchParams();
    query.append("codigo", params.codigo.trim());
    if (params.max_alumnos) {
      query.append("max_alumnos", String(params.max_alumnos));
    }

    const endpoint = `/estudiantes/?${query.toString()}`;

    // 👀 Tu request devuelve el envelope completo: { ok, data }
    const res = await this.request<{
      ok: boolean;
      data: {
        items: StudentItem[];
        total: number;
        page_size: number;
      };
    }>(endpoint);

    // 👈 CAMBIO CRÍTICO: usar `items` en lugar de `estudiantes`
    return res.data?.items ?? [];
  }

  async getStudentSelfSummary(): Promise<StudentSelfSummary> {
    const res = await this.request<ApiResponse<StudentSelfSummary>>("/mi/resumen");
    return (
      res.data ?? {
        estudiante: null,
        riesgo_actual: null,
        periodos_disponibles: [],
        periodo_sugerido: null
      }
    );
  }

  async getStudentGrades(params: { id_periodo: number }): Promise<StudentGradesResponse> {
    const query = new URLSearchParams();
    query.append("id_periodo", String(params.id_periodo));
    const endpoint = `/mi/calificaciones?${query.toString()}`;
    const res = await this.request<ApiResponse<StudentGradesResponse>>(endpoint);
    return (
      res.data ?? {
        detalle: [],
        promedio_general: null,
        resumen: { aprobados: 0, desaprobados: 0, pendientes: 0 }
      }
    );
  }

  async getAcademicMatriculas(params: { id_estudiante: number; id_periodo: number }): Promise<StudentMatricula[]> {
    const query = new URLSearchParams();
    query.append("id_periodo", String(params.id_periodo));
    const endpoint = `/academico/${params.id_estudiante}/matriculas?${query.toString()}`;
    const res = await this.request<ApiResponse<StudentMatricula[]>>(endpoint);
    return res.data ?? [];
  }

  async getAcademicAsistencias(params: { id_estudiante: number; id_periodo: number }): Promise<StudentAttendanceSummary[]> {
    const query = new URLSearchParams();
    query.append("id_periodo", String(params.id_periodo));
    const endpoint = `/academico/${params.id_estudiante}/asistencias?${query.toString()}`;
    const res = await this.request<ApiResponse<StudentAttendanceSummary[]>>(endpoint);
    return res.data ?? [];
  }

  async getAcademicGrades(params: { id_estudiante: number; id_periodo: number }): Promise<AcademicGradesResponse> {
    const query = new URLSearchParams();
    query.append("id_periodo", String(params.id_periodo));
    const endpoint = `/academico/${params.id_estudiante}/calificaciones?${query.toString()}`;
    const res = await this.request<ApiResponse<AcademicGradesResponse>>(endpoint);
    return (
      res.data ?? {
        detalle: [],
        promedio_general: null
      }
    );
  }

  async predictDropout(payload: DropoutPredictionRequest): Promise<DropoutPredictionResult> {
    const res = await this.request<ApiResponse<DropoutPredictionResult>>("/modelo/modelo-desercion", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return (
      res.data ?? {
        prediccion: 0,
        probabilidad: 0,
        nivel: "DESCONOCIDO"
      }
    );
  }

  async getTutorAssignments(id_periodo?: number): Promise<TutorAssignment[]> {
    const query = new URLSearchParams();
    if (id_periodo) {
      query.append("id_periodo", String(id_periodo));
    }
    const endpoint = query.size ? `/tutorias/tutores/mis-estudiantes?${query.toString()}` : "/tutorias/tutores/mis-estudiantes";
    const res = await this.request<ApiResponse<Array<TutorAssignment & { estudiante?: string | null }>>>(endpoint);
    return (res.data ?? []).map((item) => ({
      ...item,
      periodo: item.periodo ?? undefined,
      programa: item.programa ?? undefined,
      estudiante: item.estudiante ?? undefined,
      dni: item.dni ?? undefined,
      id_tutor: item.id_tutor ?? undefined,
      tutor: item.tutor ?? undefined,
      tutor_dni: item.tutor_dni ?? undefined,
      tutor_correo: item.tutor_correo ?? undefined
    }));
  }

  async getTutors(params?: { termino?: string; limit?: number }): Promise<TutorCatalogItem[]> {
    const query = new URLSearchParams();
    if (params?.termino) {
      query.append("termino", params.termino);
    }
    if (params?.limit) {
      query.append("limit", String(params.limit));
    }
    const endpoint = query.size ? `/tutorias/tutores/catalogo?${query.toString()}` : "/tutorias/tutores/catalogo";
    const res = await this.request<ApiResponse<TutorCatalogItem[]>>(endpoint);
    return res.data ?? [];
  }

  async assignTutor(payload: { id_estudiante: number; id_periodo: number; id_tutor: number }): Promise<ApiResponse<unknown>> {
    return this.request<ApiResponse<unknown>>("/tutorias/tutores/asignar", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async getTutorias(params: { id_estudiante?: number; id_periodo?: number }): Promise<ApiTutoriasResponse[]> {
    const query = new URLSearchParams();
    if (params.id_estudiante) {
      query.append("id_estudiante", String(params.id_estudiante));
    }
    if (params.id_periodo) {
      query.append("id_periodo", String(params.id_periodo));
    }
    const endpoint = query.size ? `/tutorias?${query.toString()}` : "/tutorias";
    const res = await this.request<ApiResponse<ApiTutoriasResponse[]>>(endpoint);
    return res.data ?? [];
  }

  async createTutoria(payload: CreateTutoriaPayload) {
    const res = await this.request<ApiResponse<unknown>>("/tutorias", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return res;
  }

  private resetTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem("sia_access");
    localStorage.removeItem("sia_refresh");
  }

  private flushQueue(error?: unknown) {
    const pending = [...this.queue];
    this.queue = [];
    pending.forEach(({ resolve, reject, path, init }) => {
      if (error) {
        reject(error);
        return;
      }
      this.request(path, init)
        .then(resolve)
        .catch(reject);
    });
  }
}

export const apiClient = new ApiClient();
