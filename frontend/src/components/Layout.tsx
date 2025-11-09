
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Layout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  const welcomeName = user?.persona?.nombres ?? "Usuario";
  const today = new Date().toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: "240px",
          backgroundColor: "#111827",
          color: "#fff",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}
      >
        <Link to="/" style={{ color: "#fff", fontWeight: 700, fontSize: "1.25rem" }}>
          SIA UNASAM
        </Link>
        <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <NavLink to="/" end style={({ isActive }) => linkStyle(isActive)}>
            Resumen de riesgo
          </NavLink>
          <NavLink to="/estudiantes" style={({ isActive }) => linkStyle(isActive)}>
            Estudiantes
          </NavLink>
          <NavLink to="/tutorias" style={({ isActive }) => linkStyle(isActive)}>
            Tutorías
          </NavLink>
        </nav>
        <div style={{ marginTop: "auto", fontSize: "0.85rem", color: "#cbd5f5" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Usuario</p>
          <p style={{ margin: "4px 0" }}>{user?.persona?.nombres}</p>
          <p style={{ margin: "4px 0" }}>{user?.correo}</p>
          <p style={{ margin: "4px 0" }}>Roles: {user?.roles?.join(", ")}</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            border: "1px solid #f87171",
            background: "transparent",
            color: "#f87171",
            padding: "8px 12px",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          Cerrar sesión
        </button>
      </aside>
      <main style={{ flex: 1, padding: "32px", backgroundColor: "#f5f6fa" }}>
        <Outlet />
      </main>
    </div>
  );
}

function linkStyle(isActive: boolean) {
  return {
    padding: "10px 12px",
    borderRadius: "6px",
    color: "#f9fafb",
    backgroundColor: isActive ? "#2563eb" : "transparent",
    fontWeight: isActive ? 600 : 500
  };
}
