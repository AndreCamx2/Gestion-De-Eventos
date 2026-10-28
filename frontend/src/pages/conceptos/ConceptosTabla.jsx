import { TablaContenedor } from "../../components/ui";
import { claseImpuesto, etiquetaImpuesto, formatCOP, precioConImpuesto } from "./conceptos";

// Tabla de conceptos. Al pulsar una fila (o su botón) se elige el concepto que
// muestra el panel.
// - seleccionadoId: id del concepto elegido (fila resaltada).
// - mostrarSitio: con varios sitios y sin filtro, cada fila dice de qué sitio es.
// - nombreSitio(id): nombre del sitio para mostrar.
export default function ConceptosTabla({ conceptos, seleccionadoId, mostrarSitio, nombreSitio, onElegir }) {
  return (
    <TablaContenedor etiqueta="Listado de conceptos" className="conceptos-tabla-caja">
      <table className="conceptos-tabla">
        <thead>
          <tr>
            <th scope="col">Concepto</th>
            <th scope="col" className="conceptos-tabla__num">Precio</th>
            <th scope="col">Imp.</th>
            <th scope="col" className="conceptos-tabla__num">Con impuesto</th>
          </tr>
        </thead>
        <tbody>
          {conceptos.map((c) => {
            const activo = seleccionadoId === c.id;
            return (
              <tr
                key={c.id}
                className={[
                  "conceptos-fila",
                  activo && "conceptos-fila--seleccionada",
                  !c.activo && "conceptos-fila--inactiva",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onElegir(c)}
              >
                <td className="conceptos-tabla__nombre">
                  <button
                    type="button"
                    className="conceptos-fila__boton"
                    aria-pressed={activo}
                    onClick={(e) => {
                      e.stopPropagation();
                      onElegir(c);
                    }}
                  >
                    {c.nombre}
                  </button>
                  {!c.activo && <span className="conceptos-inactivo">Inactivo</span>}
                  {mostrarSitio && <span className="conceptos-tabla__sitio">{nombreSitio(c.sitio)}</span>}
                </td>
                <td className="conceptos-tabla__num conceptos-tabla__suave">{formatCOP(c.precio)}</td>
                <td>
                  <span className={`conceptos-impuesto ${claseImpuesto(c.impuesto_pct)}`}>
                    {etiquetaImpuesto(c.impuesto_pct)}
                  </span>
                </td>
                <td className="conceptos-tabla__num conceptos-tabla__fuerte">
                  {formatCOP(precioConImpuesto(c.precio, c.impuesto_pct))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TablaContenedor>
  );
}
