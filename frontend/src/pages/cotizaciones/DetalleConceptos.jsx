import { pesos } from "./nuevaCotizacion";

export default function DetalleConceptos({ cotizacion }) {
  return (
    <section className="dc-conceptos" aria-label="Conceptos de la cotización">
      <div className="dc-conceptos__tabla" role="region" aria-label="Tabla de conceptos" tabIndex={0}>
        <table className="dc-tabla">
          <thead>
            <tr>
              <th scope="col">Concepto</th>
              <th scope="col" className="dc-tabla__num">Cant.</th>
              <th scope="col" className="dc-tabla__num">Precio u.</th>
              <th scope="col" className="dc-tabla__num">Imp.</th>
              <th scope="col" className="dc-tabla__num">Total</th>
            </tr>
          </thead>
          <tbody>
            {cotizacion.items.map((item) => (
              <tr key={item.id}>
                <td className="dc-tabla__concepto">{item.concepto_nombre}</td>
                <td className="dc-tabla__num">{item.cantidad}</td>
                <td className="dc-tabla__num dc-tabla__suave">{pesos(item.precio_unitario)}</td>
                <td className="dc-tabla__num dc-tabla__suave">{Number(item.impuesto_pct)}%</td>
                <td className="dc-tabla__num dc-tabla__total">{pesos(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="dc-totales">
        <div><dt>Subtotal</dt><dd>{pesos(cotizacion.subtotal)}</dd></div>
        <div><dt>Impuestos</dt><dd>{pesos(cotizacion.impuestos)}</dd></div>
        <div className="dc-totales__total"><dt className="visually-hidden">Total</dt><dd>{pesos(cotizacion.total)}</dd></div>
      </dl>
    </section>
  );
}
