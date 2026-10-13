import { EstadoBadge, TablaContenedor } from "../../components/ui";
import { estadoVisible, fechaCorta, numeroCotizacion, pesos, vigencia } from "./cotizaciones";

// Tabla de cotizaciones (maqueta Cotizaciones.dc.html). La garantía y el bloqueo
// no tienen columna propia: van como nota debajo de la vigencia.
// - cotizaciones: las que pasan los filtros; total: cuántas se cargaron.
// - hoy: fecha local de hoy, para contar los días de vigencia.
export default function CotizacionesTabla({ cotizaciones, total, hoy }) {
  return (
    <TablaContenedor etiqueta="Listado de cotizaciones">
      <table className="cotizaciones-tabla">
        <thead>
          <tr>
            <th scope="col">N.º</th>
            <th scope="col">Cliente</th>
            <th scope="col">Salón y montaje</th>
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
                <td className="cotizaciones-tabla__cliente">{c.cliente_nombre}</td>
                <td className="cotizaciones-tabla__suave">
                  {c.salon_nombre} · {c.montaje_nombre}
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
