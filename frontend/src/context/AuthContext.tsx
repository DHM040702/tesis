
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/client";
import { ApiUser } from "../types";

type AuthContextShape = {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: ApiUser | null;
  login: (correo: string, contrasenia: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextShape | undefined>(undefined);

const ACCESS_KEY = "sia_access";
const REFRESH_KEY = "sia_refresh";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem(ACCESS_KEY)
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    () => localStorage.getItem(REFRESH_KEY)
  );
  const [user, setUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_KEY);
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (token && refresh) {
      apiClient.setTokens({ accessToken: token, refreshToken: refresh });
      apiClient.getMe().then(setUser).catch(() => {
        setAccessToken(null);
        setRefreshToken(null);
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
      });
    }
  }, []);

  const login = useCallback(async (correo: string, contrasenia: string) => {
    const { access_token, refresh_token } = await apiClient.login({ correo, contrasenia });
    setAccessToken(access_token);
    setRefreshToken(refresh_token);
    localStorage.setItem(ACCESS_KEY, access_token);
    localStorage.setItem(REFRESH_KEY, refresh_token);
    apiClient.setTokens({ accessToken: access_token, refreshToken: refresh_token });
    const profile = await apiClient.getMe();
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    if (refreshToken) {
      await apiClient.logout(refreshToken);
    }
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    apiClient.setTokens({ accessToken: null, refreshToken: null });
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }, [refreshToken]);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(accessToken && refreshToken && user),
      accessToken,
      refreshToken,
      user,
      login,
      logout
    }),
    [accessToken, refreshToken, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}