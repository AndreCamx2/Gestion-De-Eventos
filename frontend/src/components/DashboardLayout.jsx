import { useState, useRef, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { IconInicio, IconCotizaciones, IconCalendario, IconClientes, IconSalones } from "./icons";
import "../styles/home.css";

export const NAV_ITEMS = [
  { to: "/inicio", label: "Inicio", icon: <IconInicio /> },
  { to: "/cotizaciones", label: "Cotizaciones", icon: <IconCotizaciones /> },
  { to: "/calendario", label: "Calendario", icon: <IconCalendario /> },
  { to: "/clientes", label: "Clientes", icon: <IconClientes /> },
  { to: "/salones", label: "Salones y Servicios", icon: <IconSalones /> },
];

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function DashboardLayout({ user = { name: "Usuario", role: "cliente" }, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // El título de la barra superior se calcula según la ruta activa,
  // usando la misma lista que arma el sidebar (una sola fuente de verdad).
  const currentItem = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));
  const pageTitle = currentItem?.label ?? "Inicio";

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__mark">S</div>
          <div>
            <p className="sidebar__brand-name">SGDE</p>
            <p className="sidebar__brand-sub">Cartagena</p>
          </div>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar__link${isActive ? " is-active" : ""}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">Sistema de Gestión de Eventos y Salones</div>
      </aside>

      <div className="dashboard-main">
        <header className="navbar">
          <h1 className="navbar__title">{pageTitle}</h1>

          <div className="navbar__profile" ref={menuRef}>
            <button
              type="button"
              className="navbar__profile-trigger"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
            >
              <div className="navbar__avatar">{getInitials(user.name)}</div>
              <div className="navbar__identity">
                <p className="navbar__name">{user.name}</p>
                <p className="navbar__role">{user.role}</p>
              </div>
              <svg
                className={`navbar__chevron${menuOpen ? " is-open" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {menuOpen && (
              <div className="navbar__menu">
                <button type="button" className="navbar__menu-item">
                  Mi perfil
                </button>
                <button
                  type="button"
                  className="navbar__menu-item navbar__menu-item--danger"
                  onClick={onLogout}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="dashboard-content">
          {/* Aquí se insertará la pantalla activa: Home, Cotizaciones, Salones, etc. */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
