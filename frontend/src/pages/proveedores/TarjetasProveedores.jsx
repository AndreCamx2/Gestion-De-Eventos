import { Boton } from "../../components/ui";
import { iniciales } from "./proveedores";

// Tarjetas de proveedor (maqueta Proveedores.dc.html). Cada una es un botón con
// aria-pressed: al elegirla, la tabla de abajo muestra su stock.
// - proveedores: ya ordenados por nombre.
// - seleccionadoId: el proveedor elegido.
// - conteos: { [idProveedor]: n } con sus elementos, o null si /stock/ no cargó
//   (entonces dice "— elementos").
// - onElegir(proveedor).
// - onUsuarioAcceso(boton): abre "Usuario de acceso" del elegido (SGDE-72). El botón
//   va debajo de la tarjeta elegida, fuera de ella: no puede haber un botón dentro de otro.
function textoElementos(n) {
  if (n === null) return "— elementos";
  return n === 1 ? "1 elemento" : `${n} elementos`;
}

export default function TarjetasProveedores({ proveedores, seleccionadoId, conteos, onElegir, onUsuarioAcceso }) {
  return (
    <ul className="proveedores-tarjetas" aria-label="Proveedores">
      {proveedores.map((p) => {
        const elegido = p.id === seleccionadoId;
        const n = conteos ? conteos[p.id] ?? 0 : null;
        return (
          <li key={p.id} className="proveedores-tarjetas__celda">
            <button
              type="button"
              className="proveedor-tarjeta"
              aria-pressed={elegido}
              onClick={() => onElegir(p)}
            >
              <span className="proveedor-tarjeta__fila">
                <span className="proveedor-tarjeta__iniciales" aria-hidden="true">{iniciales(p.nombre)}</span>
                <span className="proveedor-tarjeta__textos">
                  <span className="proveedor-tarjeta__nombre">{p.nombre}</span>
                  <span className="proveedor-tarjeta__ident">{p.identificacion || "Sin identificación"}</span>
                </span>
              </span>
              <span className="proveedor-tarjeta__pie">
                <span className="proveedor-tarjeta__contacto">{p.contacto || "Sin contacto"}</span>
                <span className="proveedor-tarjeta__conteo">{textoElementos(n)}</span>
              </span>
              <span className="proveedor-tarjeta__acceso">
                {p.usuario_nombre ? `Acceso: ${p.usuario_nombre}` : "Sin usuario de acceso"}
              </span>
            </button>
            {elegido && (
              <Boton
                variante="secundario"
                className="proveedor-tarjeta__vincular"
                aria-label={`Usuario de acceso de ${p.nombre}`}
                onClick={(e) => onUsuarioAcceso(e.currentTarget)}
              >
                Usuario de acceso
              </Boton>
            )}
          </li>
        );
      })}
    </ul>
  );
}
