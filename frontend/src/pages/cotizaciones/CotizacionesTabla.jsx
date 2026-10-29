import { Link } from "react-router-dom";
import { EstadoBadge, TablaContenedor } from "../../components/ui";
import { estadoVisible, fechaCorta, numeroCotizacion, pesos, vigencia } from "./cotizaciones";

export default function CotizacionesTabla({ cotizaciones, total, hoy }) {
  return (
    <TablaContenedor etiqueta="Listado de cotizaciones">
      <table className="cotizaciones-tabla">
        <thead>
          <tr>
            <th scope="col">N.º</th>
            <th scope="col">Cliente</th>
            <th scope="col">Salón y montaje</th>
            <th scope="col">Tipo de evento</th>
            <th scope="col">Evento</th>
            <th scope="col" className="cotizaciones-tabla__num">Personas</th>
            <th scope="col">Vigencia</th>
            <th scope="col" className="cotizaciones-tabla__num">Total</th>
            <th scope="col">Estado</th>
          </tr>
        </thead>
        <tbody>
          {cotizaciones.map((c) => {
            const v = vigencia(c, hoy);
            return (
              <tr key={c.id}>
                <td className="cotizaciones-tabla__numero">{numeroCotizacion(c.id)}</td>
                <td className="cotizaciones-tabla__cliente">
                  <Link to={`/cotizaciones/${c.id}`} className="cotizaciones-tabla__enlace">{c.cliente_nombre}</Link>
                </td>
                <td className="cotizaciones-tabla__suave">
                  {c.salon_nombre} · {c.montaje_nombre}
                </td>
                <td className="cotizaciones-tabla__tipo">
                  <span>{c.tipo_evento?.nombre || "Sin clasificar"}</span>
                  {c.grupo_evento?.nombre && (
                    <small className="cotizaciones-tabla__grupo">{c.grupo_evento.nombre}</small>
                  )}
                </td>
                <td>{fechaCorta(c.fecha_evento)}</td>
                <td className="cotizaciones-tabla__num">{c.cantidad_personas}</td>
                <td>
                  {v.fecha}
                  {v.nota && (
                    <span className={`cotizaciones-vigencia cotizaciones-vigencia--${v.tono}`}>{v.nota}</span>
                  )}
                </td>
                <td className="cotizaciones-tabla__num cotizaciones-tabla__total">{pesos(Number(c.total || 0))}</td>
                <td><EstadoBadge estado={estadoVisible(c)} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="cotizaciones-pie" role="status">
        Mostrando {cotizaciones.length} de {total}
      </p>
    </TablaContenedor>
  );
}
