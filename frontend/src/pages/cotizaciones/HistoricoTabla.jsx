import { Link } from "react-router-dom";
import { EstadoBadge, TablaContenedor } from "../../components/ui";
import { estadoVisible, fechaCorta, numeroCotizacion, pesos } from "./cotizaciones";
import { realizado } from "./historico";

export default function HistoricoTabla({ eventos, hoy }) {
  return (
    <TablaContenedor etiqueta="Histórico de eventos">
      <table className="cotizaciones-tabla">
        <thead>
          <tr>
            <th scope="col">N.º</th>
            <th scope="col">Cliente</th>
            <th scope="col">Salón y montaje</th>
            <th scope="col">Evento</th>
            <th scope="col" className="cotizaciones-tabla__num">Personas</th>
            <th scope="col" className="cotizaciones-tabla__num">Total</th>
            <th scope="col">Estado</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((e) => (
            <tr key={e.id}>
              <td className="cotizaciones-tabla__numero">{numeroCotizacion(e.id)}</td>
              <td className="cotizaciones-tabla__cliente">
                <Link to={`/cotizaciones/${e.id}`} className="cotizaciones-tabla__enlace">{e.cliente_nombre}</Link>
              </td>
              <td className="cotizaciones-tabla__suave">
                {e.salon_nombre} · {e.montaje_nombre}
              </td>
              <td>
                {fechaCorta(e.fecha_evento)}
                {realizado(e, hoy) && <span className="cotizaciones-vigencia cotizaciones-vigencia--confirmado">realizado</span>}
              </td>
              <td className="cotizaciones-tabla__num">{e.cantidad_personas}</td>
              <td className="cotizaciones-tabla__num cotizaciones-tabla__total">{pesos(Number(e.total || 0))}</td>
              <td><EstadoBadge estado={estadoVisible(e)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="cotizaciones-pie" role="status">
        {eventos.length === 1 ? "1 evento" : `${eventos.length} eventos`}
      </p>
    </TablaContenedor>
  );
}
