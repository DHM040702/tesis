import dayjs from "dayjs";
import { ApiLoginResponse, ApiResponse, ApiTutoriasResponse, ApiUser, RiskSummaryItem, StudentItem } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

type Tokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private queue: Array<() => void> = [];

  setTokens(tokens: Tokens) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    };
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers
    });

    if (response.status === 401 && this.refreshToken) {
      return this.handleUnauthorized<T>(path, init);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Error al comunicarse con el servidor");
    }
    return response.json();
  }

  private async handleUnauthorized<T>(path: string, init?: RequestInit): Promise<T> {
    if (!this.refreshToken) {
      throw new Error("Sesión expirada");
    }

    if (this.isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        this.queue.push(async () => {
          try {
            const data = await this.request<T>(path, init);
            resolve(data);
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    this.isRefreshing = true;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: this.refreshToken })
      });
      if (!res.ok) {
        throw new Error("No se pudo refrescar la sesión");
      }
      const tokens: ApiLoginResponse = await res.json();
      this.accessToken = tokens.access_token;
      this.refreshToken = tokens.refresh_token;
      localStorage.setItem("sia_access", tokens.access_token);
      localStorage.setItem("sia_refresh", tokens.refresh_token);
      const data = await this.request<T>(path, init);
      this.queue.forEach((cb) => cb());
      this.queue = [];
      return data;
    } finally {
      this.isRefreshing = false;
    }
  }

  async login(payload: { correo: string; contrasenia: string }): Promise<ApiLoginResponse> {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error("Credenciales incorrectas");
    }
    const data: ApiLoginResponse = await res.json();
    this.setTokens({ accessToken: data.access_token, refreshToken: data.refresh_token });
    return data;
  }

  async logout(refreshToken: string) {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
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

  async getPeriodos() {
    const res = await this.request<ApiResponse<Array<{ id_periodo: number; nombre: string }>>>(
      "/catalogos/periodos"
    );
    return res.data ?? [];
  }

  async getProgramas() {
    const res = await this.request<ApiResponse<Array<{ id_programa: number; nombre: string }>>>(
      "/catalogos/programas"
    );
    return res.data ?? [];
  }

  async getNivelesRiesgo() {
    const res = await this.request<ApiResponse<Array<{ id_nivel_riesgo: number; nombre: string }>>>(
      "/catalogos/niveles-riesgo"
    );
    return res.data ?? [];
  }

  async getStudents(filters: { programa?: number; periodo?: number; riesgo?: string }) {
    const query = new URLSearchParams();
    if (filters.programa) query.append("programa", String(filters.programa));
    if (filters.periodo) query.append("periodo", String(filters.periodo));
    if (filters.riesgo) query.append("riesgo", filters.riesgo);
    const res = await this.request<ApiResponse<StudentItem[]>>(`/estudiantes/?${query.toString()}`);
    return res.data ?? [];
  }

  async getTutorAssignments(id_periodo?: number) {
    const query = id_periodo ? `?id_periodo=${id_periodo}` : "";
    const res = await this.request<ApiResponse<StudentItem[]>>(`/tutorias/tutores/mis-estudiantes${query}`);
    return res.data ?? [];
  }

  async getTutorias(filters: { id_estudiante?: number; id_periodo?: number }): Promise<ApiTutoriasResponse[]> {
    const query = new URLSearchParams();
    if (filters.id_estudiante) query.append("id_estudiante", String(filters.id_estudiante));
    if (filters.id_periodo) query.append("id_periodo", String(filters.id_periodo));
    const res = await this.request<ApiResponse<ApiTutoriasResponse[]>>(`/tutorias/?${query.toString()}`);
    return res.data ?? [];
  }

  async createTutoria(payload: {
    id_estudiante: number;
    id_periodo: number;
    fecha_hora?: string;
    id_modalidad: number;
    tema: string;
    observaciones?: string;
    seguimiento?: string;
    id_tutor_override?: number;
  }) {
    const body = {
      ...payload,
      fecha_hora: payload.fecha_hora ? dayjs(payload.fecha_hora).toISOString() : null
    };
    const res = await this.request<ApiResponse<unknown>>("/tutorias/", {
      method: "POST",
      body: JSON.stringify(body)
    });
    return res;
  }
}

export const apiClient = new ApiClient();