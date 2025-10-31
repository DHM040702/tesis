import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { StudentsPage } from "./pages/StudentsPage";
import { TutoriasPage } from "./pages/TutoriasPage";
import { useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          isAuthenticated ? <Layout /> : <Navigate to="/login" replace />
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="estudiantes" element={<StudentsPage />} />
        <Route path="tutorias" element={<TutoriasPage />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
    </Routes>
  );
}