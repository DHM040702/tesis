import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { resolveDashboardVariant, DashboardVariant } from "../utils/roles";

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
};

type TopbarAction = {
  label: string;
  variant: "primary" | "ghost";
  to?: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

const NAV_BY_VARIANT: Record<DashboardVariant, NavItem[]> = {
  admin: [
    { to: "/", label: "Resumen de riesgo", end: true },
    { to: "/estudiantes", label: "Estudiantes" },
    { to: "/tutorias", label: "Tutorías" }
  ],
  tutor: [
    { to: "/", label: "Panel del tutor", end: true },
    { to: "/estudiantes", label: "Estudiantes asignados" },
    { to: "/tutorias", label: "Tutorías" }
  ],
  student: [
    { to: "/", label: "Mi resumen", end: true },
    { to: "/tutorias", label: "Mis tutorías" }
  ]
};

const TOPBAR_ACTIONS: Record<DashboardVariant, TopbarAction[]> = {
  admin: [
    { label: "Descargar reporte", variant: "ghost" },
    { label: "Registrar tutoría", variant: "primary", to: "/tutorias" }
  ],
  tutor: [
    { label: "Ver estudiantes", variant: "ghost", to: "/estudiantes" },
    { label: "Registrar tutoría", variant: "primary", to: "/tutorias" }
  ],
  student: [
    { label: "Ver tutorías", variant: "primary", to: "/tutorias" },
    { label: "Contactar soporte", variant: "ghost", href: "mailto:soporte@unasam.edu.pe" }
  ]
};

const EYEBROW_BY_VARIANT: Record<DashboardVariant, string> = {
  admin: "Panel institucional",
  tutor: "Panel del tutor",
  student: "Panel del estudiante"
};

export function Layout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const variant = resolveDashboardVariant(user?.roles);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  const welcomeName = user?.persona?.nombres ?? "Usuario";
  const firstName = welcomeName.split(" ")[0];
  const identityLabel = user?.persona?.dni ?? user?.correo ?? welcomeName;
  const navItems = NAV_BY_VARIANT[variant];
  const topbarActions = TOPBAR_ACTIONS[variant];
  const topbarEyebrow = EYEBROW_BY_VARIANT[variant];
  const topbarTitle = variant === "student" ? `Hola, ${firstName}` : identityLabel;
  const today = new Date().toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

  const renderTopbarAction = (action: TopbarAction) => {
    const key = `${action.label}-${action.variant}`;
    const className = `button button--${action.variant}`;
    if (action.to) {
      return (
        <Link key={key} to={action.to} className={className}>
          {action.label}
        </Link>
      );
    }
    if (action.href) {
      return (
        <a key={key} href={action.href} className={className}>
          {action.label}
        </a>
      );
    }
    return (
      <button key={key} type="button" className={className} onClick={action.onClick} disabled={action.disabled}>
        {action.label}
      </button>
    );
  };

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
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => linkClass(isActive)} onClick={closeSidebar}>
              <span className="sidebar__link-indicator" aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          ))}
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
            <p className="app-topbar__eyebrow">{topbarEyebrow}</p>
            <h1 className="app-topbar__title">{topbarTitle}</h1>
            <span className="app-topbar__date">{today}</span>
          </div>
          <div className="app-topbar__actions">{topbarActions.map(renderTopbarAction)}</div>
        </header>
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
