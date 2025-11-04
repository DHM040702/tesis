import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type NavLinkState = { isActive: boolean; isPending: boolean; isTransitioning: boolean };

const navLinkClasses = ({ isActive }: NavLinkState) =>
  ["app-nav-link", isActive ? "is-active" : ""].filter(Boolean).join(" ");

export function Layout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link to="/" className="sidebar-brand">
          SIA UNASAM
        </Link>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={navLinkClasses}>
            Resumen de riesgo
          </NavLink>
          <NavLink to="/estudiantes" className={navLinkClasses}>
            Estudiantes
          </NavLink>
          <NavLink to="/tutorias" className={navLinkClasses}>
            Tutorías
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <strong>{user?.persona?.nombres}</strong>
          <span>{user?.correo}</span>
          <span>Roles: {user?.roles?.join(", ")}</span>
        </div>
        <button type="button" onClick={handleLogout} className="button button--ghost">
          Cerrar sesión
        </button>
      </aside>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}