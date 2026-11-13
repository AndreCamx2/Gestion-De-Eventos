import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { RUTA_NUEVA } from "./piezasBarraInferior";
import { IconoMas, IconoNueva } from "./IconosBarraInferior";
import "../styles/barra-inferior.css";

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

  const activo = items.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
  );

  function cerrar({ devolverFoco = false } = {}) {
    setAbierto(false);
    if (devolverFoco) botonRef.current?.focus();
  }

  useEffect(() => {
    setAbierto(false);
  }, [location.pathname]);

  useEffect(() => {
    if (abierto) opcionesDe(menuRef.current)[0]?.focus();
  }, [abierto]);

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
