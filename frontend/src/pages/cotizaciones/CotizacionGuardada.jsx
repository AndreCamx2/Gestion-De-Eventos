import { Link } from "react-router-dom";
import { Boton, EstadoBadge, Tarjeta } from "../../components/ui";
import { estadoVisible, fechaCorta, numeroCotizacion } from "./cotizaciones";
import { pesos } from "./nuevaCotizacion";

export default function CotizacionGuardada({ cotizacion, onOtra }) {
  return (
    <Tarjeta as="section" className="nc-guardada" aria-labelledby="nc-guardada-titulo">
      <div className="nc-guardada__cabecera">
        <div>
          <p className="nc-guardada__numero">Cotización {numeroCotizacion(cotizacion.id)}</p>
          <h2 id="nc-guardada-titulo" className="nc-guardada__titulo">Quedó guardada</h2>
        </div>
        <EstadoBadge estado={estadoVisible(cotizacion)} />
      </div>

      <dl className="nc-guardada__datos">
        <div><dt>Cliente</dt><dd>{cotizacion.cliente?.nombre}</dd></div>
        <div><dt>Salón</dt><dd>{cotizacion.salon?.nombre} · {cotizacion.montaje?.nombre}</dd></div>
        <div><dt>Evento</dt><dd>{fechaCorta(cotizacion.fecha_evento)} · {cotizacion.cantidad_personas} personas</dd></div>
        <div><dt>Válida hasta</dt><dd>{fechaCorta(cotizacion.validez_oferta)}</dd></div>
      </dl>

      <div className="nc-tabla-caja" role="region" aria-label="Conceptos guardados" tabIndex={0}>
        <table className="nc-tabla">
          <thead>
            <tr>
              <th scope="col">Concepto</th>
              <th scope="col" className="nc-tabla__num">Cantidad</th>
              <th scope="col" className="nc-tabla__num">Precio u.</th>
              <th scope="col" className="nc-tabla__num">Impuesto</th>
              <th scope="col" className="nc-tabla__num">Total</th>
            </tr>
          </thead>
          <tbody>
            {cotizacion.items.map((item) => (
              <tr key={item.id}>
                <td className="nc-tabla__concepto">{item.concepto_nombre}</td>
                <td className="nc-tabla__num">{item.cantidad}</td>
                <td className="nc-tabla__num nc-tabla__suave">{pesos(item.precio_unitario)}</td>
                <td className="nc-tabla__num nc-tabla__suave">{pesos(item.impuesto)}</td>
                <td className="nc-tabla__num nc-tabla__total">{pesos(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="nc-guardada__totales">
        <div><dt>Subtotal</dt><dd>{pesos(cotizacion.subtotal)}</dd></div>
        <div><dt>Impuestos</dt><dd>{pesos(cotizacion.impuestos)}</dd></div>
        <div className="nc-guardada__total"><dt>Total</dt><dd>{pesos(cotizacion.total)}</dd></div>
      </dl>

      <div className="nc-guardada__acciones">
        <Boton as={Link} to="/cotizaciones">Ver cotizaciones</Boton>
        <Boton variante="secundario" onClick={onOtra}>Armar otra cotización</Boton>
      </div>
    </Tarjeta>
  );
}
