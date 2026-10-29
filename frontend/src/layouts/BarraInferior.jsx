import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { RUTA_NUEVA } from "./piezasBarraInferior";
import { IconoMas, IconoNueva } from "./IconosBarraInferior";
import "../styles/barra-inferior.css";

// Barra de navegación inferior del teléfono (SGDE-102, maqueta Movil.dc.html).
// Cinco piezas: Inicio, Cotizar, "+" (nueva cotización), Agenda y "Más".
// Los destinos salen de NAV_ITEMS (DashboardLayout) ya filtrados por rol y repartidos
// por piezasBarraInferior (piezasBarraInferior.js); lo que no cabe en la barra va al menú
// "Más". Solo se ve en teléfono (barra-inferior.css).

// Opciones del menú "Más", en el orden en que aparecen.
function opcionesDe(menu) {
  return Array.from(menu?.querySelectorAll('[role="menuitem"]') ?? []);
}

function Pieza({ to, label, Icono }) {
  return (
    <NavLink to={to} className="barra-inferior__pieza">
      <Icono />
      <span>{label}</span>
    </NavLink>
  );
}

function MenuMas({ items }) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef(null);
  const botonRef = useRef(null);
  const menuRef = useRef(null);
  const location = useLocation();

  // "Más" se marca como activo cuando la pantalla actual está dentro de su menú.
  const activo = items.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
  );

  function cerrar({ devolverFoco = false } = {}) {
    setAbierto(false);
    if (devolverFoco) botonRef.current?.focus();
  }

  // Al cambiar de pantalla (se eligió una opción) el menú se cierra.
  useEffect(() => {
    setAbierto(false);
  }, [location.pathname]);

  // Al abrir, el foco pasa a la primera opción.
  useEffect(() => {
    if (abierto) opcionesDe(menuRef.current)[0]?.focus();
  }, [abierto]);

  // Clic o toque fuera del menú lo cierra.
  useEffect(() => {
    if (!abierto) return;
    function alTocarFuera(event) {
      if (!contenedorRef.current?.contains(event.target)) setAbierto(false);
    }
    document.addEventListener("pointerdown", alTocarFuera);
    return () => document.removeEventListener("pointerdown", alTocarFuera);
  }, [abierto]);

  function alPulsarBoton(event) {
    // Flecha arriba o abajo abren el menú (patrón de botón de menú de WAI-ARIA).
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      setAbierto(true);
    }
  }

  function alPulsarMenu(event) {
    const lista = opcionesDe(menuRef.current);
    const actual = lista.indexOf(document.activeElement);
    const ir = (indice) => lista[(indice + lista.length) % lista.length]?.focus();

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        cerrar({ devolverFoco: true });
        break;
      case "ArrowDown":
        event.preventDefault();
        ir(actual + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        ir(actual - 1);
        break;
      case "Home":
        event.preventDefault();
        ir(0);
        break;
      case "End":
        event.preventDefault();
        ir(lista.length - 1);
        break;
      case "Tab":
        // Salir del menú con Tab lo cierra, sin atrapar el foco.
        setAbierto(false);
        break;
      default:
        break;
    }
  }

  return (
    <div className="barra-inferior__mas" ref={contenedorRef}>
      <button
        type="button"
        ref={botonRef}
        className={`barra-inferior__pieza${activo ? " barra-inferior__pieza--activa" : ""}`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls="barra-inferior-menu"
        onClick={() => setAbierto((valor) => !valor)}
        onKeyDown={alPulsarBoton}
      >
        <IconoMas />
        <span>Más</span>
      </button>

      {abierto && (
        <ul
          className="barra-inferior__menu"
          id="barra-inferior-menu"
          role="menu"
          aria-label="Más pantallas"
          ref={menuRef}
          onKeyDown={alPulsarMenu}
        >
          {items.map((item) => (
            <li key={item.to} role="none">
              <NavLink to={item.to} role="menuitem" className="barra-inferior__opcion">
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function BarraInferior({ piezas }) {
  const { fijas, enMas, nueva } = piezas;
  // El "+" va en el centro, como en la maqueta: Inicio y Cotizar a la izquierda,
  // Agenda y "Más" a la derecha.
  const antes = fijas.filter((pieza) => pieza.to !== "/calendario");
  const despues = fijas.filter((pieza) => pieza.to === "/calendario");

  return (
    <nav className="barra-inferior" aria-label="Principal en el teléfono">
      {antes.map((pieza) => (
        <Pieza key={pieza.to} {...pieza} />
      ))}

      {nueva && (
        <NavLink to={RUTA_NUEVA} end className="barra-inferior__nueva" aria-label="Nueva cotización">
          <IconoNueva />
        </NavLink>
      )}

      {despues.map((pieza) => (
        <Pieza key={pieza.to} {...pieza} />
      ))}

      {enMas.length > 0 && <MenuMas items={enMas} />}
    </nav>
  );
}
