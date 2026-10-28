import { ETIQUETAS } from "../../utils/estadosCotizacion";
import "./EstadoBadge.css";

// Etiqueta del estado de una cotización: siempre texto + punto, nunca solo color
// (guía, sección 2). Las etiquetas viven en utils/estadosCotizacion.js.
//
// OJO: el backend NO guarda "vencida". Cotizacion.estado solo puede ser
// cotizado, bloqueado, confirmado o cancelado. Quien use este componente debe
// pasar estado="vencida" cuando la cotización esté vencida y su estado sea
// "cotizado" (estadoVisible() de utils/estadosCotizacion.js lo hace).
export default function EstadoBadge({ estado, className = "" }) {
  const clave = String(estado ?? "").toLowerCase();
  const conocido = Object.hasOwn(ETIQUETAS, clave);
  // Un estado desconocido se pinta neutro con su texto, en vez de romper la pantalla.
  const texto = conocido ? ETIQUETAS[clave] : estado || "Sin estado";
  const clases = ["estado-badge", conocido && `estado-badge--${clave}`, className].filter(Boolean).join(" ");

  return (
    <span className={clases}>
      <span className="estado-badge__punto" aria-hidden="true" />
      {texto}
    </span>
  );
}
