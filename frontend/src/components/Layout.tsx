import { useState } from "react";
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
    <div className={`app-shell${sidebarOpen ? " is-sidebar-open" : ""}`}>
      <aside className={`sidebar${sidebarOpen ? " is-open" : ""}`}>
        <button type="button" className="sidebar__close" onClick={toggleSidebar} aria-label="Cerrar menú lateral">
          ✕
        </button>
        <Link to="/" className="sidebar__brand" onClick={closeSidebar}>
          <span className="sidebar__brand-mark">SIA</span>
          <span className="sidebar__brand-text">Sistema Integral de Acompañamiento</span>
        </Link>
        <nav className="sidebar__nav">
          <NavLink to="/" end className={({ isActive }) => linkClass(isActive)} onClick={closeSidebar}>
            <span className="sidebar__link-indicator" aria-hidden />
            <span>Resumen de riesgo</span>
          </NavLink>
          <NavLink to="/estudiantes" className={({ isActive }) => linkClass(isActive)} onClick={closeSidebar}>
            <span className="sidebar__link-indicator" aria-hidden />
            <span>Estudiantes</span>
          </NavLink>
          <NavLink to="/tutorias" className={({ isActive }) => linkClass(isActive)} onClick={closeSidebar}>
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
      {sidebarOpen && <div className="sidebar__overlay" onClick={closeSidebar} aria-hidden />}
      <main className="app-content">
        <header className="app-topbar">
          <div className="app-topbar__meta">
            <button type="button" className="app-topbar__menu" onClick={toggleSidebar} aria-label="Abrir menú">
              ☰
            </button>
            <p className="app-topbar__eyebrow">Panel principal</p>
            <h1 className="app-topbar__title">{welcomeName}</h1>
            <span className="app-topbar__date">{today}</span>
          </div>
          <div className="app-topbar__actions">
            <button type="button" className="button button--ghost">
              Descargar reporte
            </button>
            <button type="button" className="button button--primary">
              Registrar tutoría
            </button>
          </div>
        </header>
        <br></br>
        <br></br>
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
