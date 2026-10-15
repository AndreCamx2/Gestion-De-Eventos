import { useState, useRef, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ROLES_POR_RUTA } from "../routes/rutasPorRol";
import BarraInferior from "./BarraInferior";
import { piezasBarraInferior } from "./piezasBarraInferior";
import "../styles/dashboard-layout.css";

// Única fuente de las pestañas de la barra superior.
// El orden sigue la maqueta de Piedra viva.
const NAV_ITEMS = [
  // Los roles de cada pestaña salen de rutasPorRol.js (SGDE-54), la misma lista que usa
  // RoleRoute. Es solo experiencia de usuario; la seguridad real es el 403 del API.
  { to: "/inicio", label: "Inicio", roles: ROLES_POR_RUTA["/inicio"] },
  { to: "/cotizaciones", label: "Cotizaciones", roles: ROLES_POR_RUTA["/cotizaciones"] },
  { to: "/calendario", label: "Calendario", roles: ROLES_POR_RUTA["/calendario"] },
  { to: "/rack", label: "Rack", roles: ROLES_POR_RUTA["/rack"] },
  { to: "/salones", label: "Salones", roles: ROLES_POR_RUTA["/salones"] },
  { to: "/conceptos", label: "Conceptos", roles: ROLES_POR_RUTA["/conceptos"] },
  { to: "/proveedores", label: "Proveedores", roles: ROLES_POR_RUTA["/proveedores"] },
  { to: "/clientes", label: "Clientes", roles: ROLES_POR_RUTA["/clientes"] },
  { to: "/sitios", label: "Sitios", roles: ROLES_POR_RUTA["/sitios"] },
  { to: "/usuarios", label: "Usuarios", roles: ROLES_POR_RUTA["/usuarios"] },
  { to: "/mi-stock", label: "Mi stock", roles: ROLES_POR_RUTA["/mi-stock"] },
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
  const botonPerfilRef = useRef(null);
  const pestanasRef = useRef(null);
  const location = useLocation();

  // Cierra el menú del perfil al hacer clic afuera.
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Con el menú abierto, Escape lo cierra y devuelve el foco al avatar.
  useEffect(() => {
    if (!menuOpen) return;
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        botonPerfilRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  // En teléfono las pestañas se desplazan en horizontal: al cambiar de ruta,
  // se mueve esa fila (sin animación) para que la pestaña activa quede a la vista.
  // No se usa scrollIntoView porque también movería la página en vertical.
  useEffect(() => {
    const fila = pestanasRef.current;
    const activa = fila?.querySelector('[aria-current="page"]');
    if (!fila || !activa) return;
    const margen = 16;
    const inicio = activa.offsetLeft;
    const fin = inicio + activa.offsetWidth;
    if (inicio < fila.scrollLeft) {
      fila.scrollLeft = inicio - margen;
    } else if (fin > fila.scrollLeft + fila.clientWidth) {
      fila.scrollLeft = fin - fila.clientWidth + margen;
    }
  }, [location.pathname]);

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));
  // En el teléfono, si el rol tiene más de un destino, la navegación pasa a la barra
  // inferior (SGDE-102) y las pestañas de arriba se ocultan (dashboard-layout.css).
  const piezasBarra = piezasBarraInferior(visibleItems, user.role);

  return (
    <div className={`panel${piezasBarra.hayBarra ? " panel--barra-inferior" : ""}`}>
      <header className="barra-superior">
        <div className="barra-superior__interior">
          <Link to="/inicio" className="barra-superior__logo" aria-label="SGDE, ir al inicio">
            <span className="barra-superior__marca" aria-hidden="true">S</span>
            <span aria-hidden="true">SGDE</span>
          </Link>

          <nav className="barra-superior__pestanas" aria-label="Principal" ref={pestanasRef}>
            {visibleItems.map((item) => (
              <NavLink key={item.to} to={item.to} className="barra-superior__pestana">
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="perfil" ref={menuRef}>
            <button
              type="button"
              className="perfil__boton"
              ref={botonPerfilRef}
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="perfil-menu"
              aria-label={`Menú de usuario de ${user.name}`}
            >
              <span className="perfil__avatar" aria-hidden="true">
                {getInitials(user.name)}
              </span>
            </button>

            {menuOpen && (
              <div className="perfil__menu" id="perfil-menu">
                <div className="perfil__encabezado">
                  <p className="perfil__nombre">Hola, {user.name}</p>
                  <p className="perfil__rol">{user.role}</p>
                </div>
                <div className="perfil__divisor" />
                <button
                  type="button"
                  className="perfil__opcion"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="panel__contenido">
        {/* Aquí se inserta la pantalla activa: Home, Cotizaciones, Salones, etc.
            Cada pantalla trae su único <h1> (CabeceraPagina o el saludo del Inicio). */}
        <Outlet />
      </main>

      {piezasBarra.hayBarra && <BarraInferior piezas={piezasBarra} />}
    </div>
  );
}
