import { TablaContenedor, Tarjeta } from "../../components/ui";
import { pesos } from "./proveedores";

const formatoCantidad = new Intl.NumberFormat("es-CO");

// Un elemento en "Comparar precios" (SGDE-71): su nombre y el mejor precio en
// grande, y la tabla de ofertas tal como llega del API (disponibles de la más
// barata a la más cara, agotadas al final). La fila del mejor precio dice "Mejor
// precio" (no solo color) y las agotadas van atenuadas con "Agotado". El contacto
// es como se solicita el elemento en la beta. En teléfono cada fila se pinta como
// tarjeta (CSS): los role explícitos conservan la tabla para lectores de pantalla
// al cambiar el display, y data-etiqueta pone el nombre de cada dato.
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
