import { TablaContenedor, Tarjeta } from "../../components/ui";
import { pesos } from "./proveedores";

const formatoCantidad = new Intl.NumberFormat("es-CO");

// En teléfono cada fila es una tarjeta: los role explícitos conservan la tabla para
// lectores de pantalla al cambiar el display.
export default function OfertasElemento({ grupo, indice }) {
  const idTitulo = `comparar-elemento-${indice}`;

  return (
    <Tarjeta as="section" className="comparar-bloque" aria-labelledby={idTitulo}>
      <div className="comparar-bloque__cabecera">
        <h2 id={idTitulo} className="comparar-bloque__elemento">{grupo.elemento}</h2>
        {grupo.mejor_precio === null ? (
          <p className="comparar-bloque__sin-precio">Agotado en todos los proveedores</p>
        ) : (
          <p className="comparar-bloque__mejor">
            Mejor precio <strong>{pesos(grupo.mejor_precio)}</strong>
          </p>
        )}
      </div>
      <TablaContenedor etiqueta={`Ofertas de ${grupo.elemento}`}>
        <table className="comparar-tabla" role="table">
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">Proveedor</th>
              <th scope="col" role="columnheader" className="comparar-tabla__num">Disponible</th>
              <th scope="col" role="columnheader" className="comparar-tabla__num">Valor unitario</th>
              <th scope="col" role="columnheader">Contacto</th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {grupo.ofertas.map((o) => {
              const agotado = o.cantidad === 0;
              const clases = [o.es_mejor_precio && "comparar-tabla__fila--mejor", agotado && "comparar-tabla__fila--agotada"];
              return (
                <tr key={o.stock_id} role="row" className={clases.filter(Boolean).join(" ") || undefined}>
                  <th scope="row" role="rowheader" className="comparar-tabla__proveedor">
                    {o.proveedor}
                    {o.es_mejor_precio && <span className="comparar-etiqueta comparar-etiqueta--mejor">Mejor precio</span>}
                  </th>
                  <td role="cell" className="comparar-tabla__num comparar-tabla__cantidad" data-etiqueta="Disponible">
                    {agotado ? (
                      <span className="comparar-etiqueta comparar-etiqueta--agotado">Agotado</span>
                    ) : (
                      formatoCantidad.format(o.cantidad)
                    )}
                  </td>
                  <td role="cell" className="comparar-tabla__num comparar-tabla__valor" data-etiqueta="Valor unitario">{pesos(o.valor)}</td>
                  <td role="cell" className="comparar-tabla__contacto" data-etiqueta="Contacto">{o.contacto || "Sin contacto"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TablaContenedor>
    </Tarjeta>
  );
}
