import { ETIQUETAS } from "../../utils/estadosCotizacion";
import "./LeyendaEstados.css";

// Leyenda de colores por estado (maqueta Calendario): una muestra y su etiqueta.
// La usan el Rack (SGDE-69) y el Calendario (SGDE-45).
// - estados: los que se muestran y en qué orden, por ejemplo
//   ["disponible", "cotizado", "bloqueado", "confirmado"].
// - etiqueta: nombre de la lista para lectores de pantalla.
// Los colores salen de las variables --estado-*-fondo y --estado-*-punto de tokens.css.
export default function LeyendaEstados({ estados, etiqueta = "Leyenda de estados", className = "" }) {
  return (
    <ul className={["leyenda-estados", className].filter(Boolean).join(" ")} aria-label={etiqueta}>
      {estados.map((estado) => (
        <li key={estado} className={`leyenda-estados__item leyenda-estados__item--${estado}`}>
          <span className="leyenda-estados__muestra" aria-hidden="true" />
          {ETIQUETAS[estado] ?? estado}
        </li>
      ))}
    </ul>
  );
}
