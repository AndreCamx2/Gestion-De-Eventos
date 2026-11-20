import { ETIQUETAS } from "../../utils/estadosCotizacion";
import "./LeyendaEstados.css";

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
