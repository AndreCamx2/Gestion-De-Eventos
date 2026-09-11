import { useState, useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";
import "../styles/home.css";

const NAV_ITEMS = [
  {
    to: "/inicio",
    label: "Inicio",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 11.5 12 5l8 6.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 10v9h12v-9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/cotizaciones",
    label: "Cotizaciones",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M6 4h9l3 3v13H6z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 10h6M9 13h6M9 16h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: "/calendario",
    label: "Calendario",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="4" y="5.5" width="16" height="15" rx="1" />
        <path d="M4 10h16M8 3.5v3M16 3.5v3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: "/clientes",
    label: "Clientes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="9" cy="9" r="3" />
        <path d="M3.5 19c.8-3 2.9-4.5 5.5-4.5s4.7 1.5 5.5 4.5" strokeLinecap="round" />
        <path d="M15.5 8.2a3 3 0 1 1 2 5.5M18.3 14.3c1.7.7 2.7 2.2 3.2 4.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: "/salones",
    label: "Salones y Servicios",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="5" y="3.5" width="10" height="17" rx="0.5" />
        <path
          d="M15 9h4v11.5h-4M8 7.5h.01M12 7.5h.01M8 11h.01M12 11h.01M8 14.5h.01M12 14.5h.01"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

const QUICK_ACCESS = [
  {
    to: "/cotizaciones",
    accent: true,
    title: "Solicitar cotización",
    desc: "Genera una cotización para un evento a partir de fecha, salón y servicios requeridos.",
    icon: NAV_ITEMS[1].icon,
  },
  {
    to: "/calendario",
    title: "Calendario de disponibilidad",
    desc: "Consulta la ocupación de los salones y confirma fechas libres antes de reservar.",
    icon: NAV_ITEMS[2].icon,
  },
  {
    to: "/clientes",
    title: "Directorio de clientes",
    desc: "Busca y administra clientes personas naturales y empresas registradas.",
    icon: NAV_ITEMS[3].icon,
  },
  {
    to: "/salones",
    title: "Catálogo de salones y servicios",
    desc: "Explora capacidad, montaje y servicios disponibles por salón.",
    icon: NAV_ITEMS[4].icon,
  },
];

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function Home({ user = { name: "Usuario", role: "cliente" }, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Cierra el menú de perfil al hacer clic fuera de él.
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          <h1 className="navbar__title">Inicio</h1>

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
          <div className="welcome">
            <h2 className="welcome__title">Bienvenido al Sistema de Gestión de Eventos y Salones</h2>
            <p className="welcome__copy">
              Desde aquí puedes generar cotizaciones, revisar la disponibilidad de
              los salones y dar seguimiento a tus clientes y eventos en Cartagena.
            </p>
          </div>

          <div className="quick-access-grid">
            {QUICK_ACCESS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={`qa-card${item.accent ? " qa-card--accent" : ""}`}
              >
                <div>
                  <div className="qa-card__icon">{item.icon}</div>
                  <h3 className="qa-card__title">{item.title}</h3>
                  <p className="qa-card__desc">{item.desc}</p>
                </div>
                <span className="qa-card__cta">Ir a la sección</span>
              </NavLink>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
