import { ETIQUETAS } from "../../utils/estadosCotizacion";
import "./EstadoBadge.css";

// El backend no guarda "vencida": se pasa con estadoVisible() de utils/estadosCotizacion.js.
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
