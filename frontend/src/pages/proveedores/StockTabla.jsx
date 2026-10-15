import { AvisoError, Boton, EstadoVacio, TablaContenedor, Tarjeta } from "../../components/ui";
import { fechaActualizado, pesos, valorTotal, valorTotalElemento } from "./proveedores";

// "Stock de {proveedor}" (maqueta Proveedores.dc.html): valor total arriba y la
// tabla con Elemento, Cantidad, Valor unitario, Valor total y Actualizado.
// - proveedor: el seleccionado.
// - elementos: su stock, ya ordenado; null si /stock/ no cargó.
// - onReintentar(): vuelve a pedir el stock (si no cargó).
// - onAgregar(boton): abre "Agregar elemento" (estado vacío).
// - onEditar(elemento, boton): abre "Editar elemento" de esa fila (SGDE-98).
// - vacio: { titulo, texto } del estado vacío; "Mi stock" (SGDE-72) le habla al proveedor.
const formatoCantidad = new Intl.NumberFormat("es-CO");

export default function StockTabla({ proveedor, elementos, onReintentar, onAgregar, onEditar, vacio }) {
  const titulo = `Stock de ${proveedor.nombre}`;

  if (elementos === null) {
    return (
      <Tarjeta as="section" aria-label={titulo}>
        <AvisoError
          titulo="No pudimos cargar el stock"
          texto="Los proveedores sí cargaron. Revisa tu conexión e inténtalo de nuevo."
          onReintentar={onReintentar}
        />
      </Tarjeta>
    );
  }

  if (elementos.length === 0) {
    return (
      <Tarjeta as="section" aria-label={titulo}>
        <EstadoVacio
          titulo={vacio?.titulo ?? `${proveedor.nombre} aún no tiene elementos`}
          texto={vacio?.texto ?? "Agrega lo que provee, cuántos hay y cuánto vale cada uno."}
          accion={
            <Boton variante="secundario" onClick={(e) => onAgregar(e.currentTarget)}>
              Agregar elemento
            </Boton>
          }
        />
      </Tarjeta>
    );
  }

  return (
    <section className="proveedores-stock" aria-labelledby="proveedores-stock-titulo">
      <div className="proveedores-stock__cabecera">
        <h2 id="proveedores-stock-titulo" className="proveedores-stock__titulo">{titulo}</h2>
        <p className="proveedores-stock__total">
          Valor total <strong>{pesos(valorTotal(elementos))}</strong>
        </p>
      </div>
      <TablaContenedor etiqueta={titulo}>
        <table className="proveedores-tabla">
          <thead>
            <tr>
              <th scope="col">Elemento</th>
              <th scope="col" className="proveedores-tabla__num">Cantidad</th>
              <th scope="col" className="proveedores-tabla__num">Valor unitario</th>
              <th scope="col" className="proveedores-tabla__num">Valor total</th>
              <th scope="col">Actualizado</th>
              <th scope="col"><span className="visually-hidden">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {elementos.map((e) => (
              <tr key={e.id}>
                <td className="proveedores-tabla__elemento">{e.nombre_elemento}</td>
                <td className="proveedores-tabla__num proveedores-tabla__cantidad">{formatoCantidad.format(e.cantidad)}</td>
                <td className="proveedores-tabla__num proveedores-tabla__suave">{pesos(Number(e.valor))}</td>
                <td className="proveedores-tabla__num proveedores-tabla__fuerte">{pesos(valorTotalElemento(e))}</td>
                <td className="proveedores-tabla__suave">{fechaActualizado(e.actualizado_en)}</td>
                <td className="proveedores-tabla__acciones">
                  <Boton
                    variante="secundario"
                    className="proveedores-tabla__editar"
                    aria-label={`Editar ${e.nombre_elemento}`}
                    onClick={(evento) => onEditar(e, evento.currentTarget)}
                  >
                    Editar
                  </Boton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablaContenedor>
    </section>
  );
}
