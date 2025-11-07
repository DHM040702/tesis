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
      <aside className="sidebar">
        <Link to="/" className="sidebar__brand">
          <span className="sidebar__brand-mark">SIA</span>
          <span className="sidebar__brand-text">Sistema Integral de Acompañamiento</span>
        </Link>
        <nav className="sidebar__nav">
          <NavLink to="/" end className={({ isActive }) => linkClass(isActive)}>
            <span className="sidebar__link-indicator" aria-hidden />
            <span>Resumen de riesgo</span>
          </NavLink>
          <NavLink to="/estudiantes" className={({ isActive }) => linkClass(isActive)}>
            <span className="sidebar__link-indicator" aria-hidden />
            <span>Estudiantes</span>
          </NavLink>
          <NavLink to="/tutorias" className={({ isActive }) => linkClass(isActive)}>
            <span className="sidebar__link-indicator" aria-hidden />
            <span>Tutorías</span>
          </NavLink>
        </nav>
        <div className="sidebar__footer">
          <div className="sidebar__profile">
            <span className="sidebar__profile-label">Usuario</span>
            <strong className="sidebar__profile-name">{user?.persona?.nombres ?? "Sin nombre"}</strong>
            <span className="sidebar__profile-email">{user?.correo}</span>
            <span className="sidebar__profile-roles">Roles: {user?.roles?.join(", ")}</span>
          </div>
          <button type="button" onClick={handleLogout} className="button button--ghost">
            Cerrar sesión
          </button>
        </div>
      </aside>
       <main className="app-content">
        <div className="app-content__inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
function linkClass(isActive: boolean) {
  return `sidebar__link${isActive ? " is-active" : ""}`;
}