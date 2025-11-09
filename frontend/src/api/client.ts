import dayjs from "dayjs";
import { ApiLoginResponse, ApiResponse, ApiTutoriasResponse, ApiUser, RiskSummaryItem, StudentItem } from "../types";

const RAW_API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const API_URL = RAW_API_URL.replace(/\/+$/, "");

type Tokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

<<<<<<< ours

=======
>>>>>>> theirs
=======
>>>>>>> theirs
class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private queue: Array<() => void> = [];

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
      this.queue.forEach((cb) => cb());
      this.queue = [];
      return data;
    } finally {
      this.isRefreshing = false;
    }
  }

  async login(payload: { correo: string; contrasenia: string }): Promise<ApiLoginResponse> {
    let res: Response;
    const targetUrl = this.buildUrl("/auth/login");
    console.info("[frontend] POST", targetUrl, {
      correo: payload.correo,
      contrasenia: payload.contrasenia
    });
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
}

export const apiClient = new ApiClient();