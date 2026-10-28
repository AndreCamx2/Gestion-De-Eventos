import { Boton } from "../../components/ui";
import { pesos, pesosDeCentavos } from "./nuevaCotizacion";
import TituloPaso from "./TituloPaso";

function Cantidad({ linea, indice, c }) {
  const nombre = linea.concepto.nombre;
  return (
    <div className="nc-cantidad">
      <button
        type="button"
        className="nc-cantidad__boton"
        aria-label={`Uno menos de ${nombre}`}
        onClick={() => c.sumarCantidad(indice, -1)}
      >
        −
      </button>
      <input
        type="number"
        min="1"
        step="1"
        inputMode="numeric"
        className="nc-cantidad__numero"
        aria-label={`Cantidad de ${nombre}`}
        value={linea.cantidad}
        onChange={(e) => c.cambiarCantidad(indice, e.target.value)}
        aria-invalid={c.errores.lineas[indice] ? true : undefined}
      />
      <button
        type="button"
        className="nc-cantidad__boton"
        aria-label={`Uno más de ${nombre}`}
        onClick={() => c.sumarCantidad(indice, 1)}
      >
        +
      </button>
    </div>
  );
}

function TablaLineas({ c }) {
  return (
    <div className="nc-tabla-caja" role="region" aria-label="Conceptos de la cotización" tabIndex={0}>
      <table className="nc-tabla">
        <thead>
          <tr>
            <th scope="col">Concepto</th>
            <th scope="col">Cantidad</th>
            <th scope="col" className="nc-tabla__num">Precio u.</th>
            <th scope="col" className="nc-tabla__num">Imp.</th>
            <th scope="col" className="nc-tabla__num">Total</th>
            <th scope="col"><span className="visually-hidden">Quitar</span></th>
          </tr>
        </thead>
        <tbody>
          {c.lineas.map((linea, indice) => (
            <tr key={linea.concepto.id}>
              <td className="nc-tabla__concepto">
                {linea.concepto.nombre}
                {c.errores.lineas[indice] && <span className="nc-error">{c.errores.lineas[indice]}</span>}
              </td>
              <td><Cantidad linea={linea} indice={indice} c={c} /></td>
              <td className="nc-tabla__num nc-tabla__suave">{pesos(linea.concepto.precio)}</td>
              <td className="nc-tabla__num">
                <span className="nc-chip">{Number(linea.concepto.impuesto_pct)}%</span>
              </td>
              <td className="nc-tabla__num nc-tabla__total">{pesosDeCentavos(linea.total)}</td>
              <td className="nc-tabla__quitar">
                <button
                  type="button"
                  className="nc-quitar"
                  aria-label={`Quitar ${linea.concepto.nombre}`}
                  onClick={() => c.quitarLinea(indice)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SeccionConceptos({ c }) {
  const sinOpciones = c.conceptosDisponibles.length === 0;

  return (
    <section className="nc-paso" aria-labelledby="nc-paso-conceptos">
      <TituloPaso numero={3} id="nc-paso-conceptos">Conceptos</TituloPaso>

      {!c.salon ? (
        <p className="nc-ayuda">Elige un salón para ver los conceptos de su sitio.</p>
      ) : (
        <>
          {c.lineas.length > 0 ? (
            <TablaLineas c={c} />
          ) : (
            <p className="nc-ayuda">Todavía no hay conceptos. Empieza por el alquiler del salón y suma los servicios.</p>
          )}

          <div className="nc-agregar">
            <label className="nc-agregar__campo">
              <span className="visually-hidden">Agregar concepto</span>
              <select
                className="nc-agregar__select"
                value={c.conceptoElegido}
                onChange={(e) => c.setConceptoElegido(e.target.value)}
                disabled={sinOpciones}
              >
                <option value="">
                  {sinOpciones ? "No quedan conceptos activos de este sitio" : "Elige un concepto…"}
                </option>
                {c.conceptosDisponibles.map((concepto) => (
                  <option key={concepto.id} value={String(concepto.id)}>
                    {concepto.nombre} · {pesos(concepto.precio)} · {Number(concepto.impuesto_pct)}%
                  </option>
                ))}
              </select>
            </label>
            <Boton variante="oscuro" onClick={c.agregarConcepto} disabled={!c.conceptoElegido}>
              Agregar
            </Boton>
          </div>
        </>
      )}
    </section>
  );
}
