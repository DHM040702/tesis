import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { apiClient } from "../api/client";
import { ApiUser } from "../types";

type AuthContextShape = {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: ApiUser | null;
  login: (correo: string, contrasenia: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextShape | undefined>(undefined);

const ACCESS_KEY = "sia_access";
const REFRESH_KEY = "sia_refresh";

type AuthProviderProps = {
  children: React.ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    apiClient.setTokens({ accessToken: null, refreshToken: null });
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_KEY);
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!token || !refresh) {
      clearSession();
      setIsLoading(false);
      return;
    }
    setAccessToken(token);
    setRefreshToken(refresh);
    apiClient.setTokens({ accessToken: token, refreshToken: refresh });
    apiClient
      .getMe()
      .then((profile) => {
        setUser(profile);
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => setIsLoading(false));
  }, [clearSession]);

  const login = useCallback(async (correo: string, contrasenia: string) => {
    const { access_token, refresh_token } = await apiClient.login({
      correo,
      contrasenia
    });
    try {
      apiClient.setTokens({ accessToken: access_token, refreshToken: refresh_token });
      const profile = await apiClient.getMe();
      setAccessToken(access_token);
      setRefreshToken(refresh_token);
      localStorage.setItem(ACCESS_KEY, access_token);
      localStorage.setItem(REFRESH_KEY, refresh_token);
      setUser(profile);
    } catch (error) {
      apiClient.setTokens({ accessToken: null, refreshToken: null });
      clearSession();
      throw error;
    }
  }, [clearSession]);

  const logout = useCallback(async () => {
    if (refreshToken) {
      try {
        await apiClient.logout(refreshToken);
      } catch {
        // ignore logout errors but still clear local state
      }
    }
    clearSession();
  }, [clearSession, refreshToken]);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(accessToken && refreshToken && user),
      isLoading,
      accessToken,
      refreshToken,
      user,
      login,
      logout
    }),
    [accessToken, refreshToken, user, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
};
