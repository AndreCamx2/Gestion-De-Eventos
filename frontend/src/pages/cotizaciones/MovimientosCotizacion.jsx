import { Boton } from "../../components/ui";
import { etiquetaMovimiento, momento, quien } from "./historico";

export default function MovimientosCotizacion({ d }) {
  return (
    <section className="dc-movimientos" aria-labelledby="dc-movimientos-titulo">
      <h2 id="dc-movimientos-titulo" className="dc-movimientos__titulo">Movimientos</h2>

      {d.cargandoMovimientos && d.movimientos.length === 0 ? (
        <p className="dc-ayuda" role="status">Cargando movimientos…</p>
      ) : d.errorMovimientos ? (
        <div className="dc-movimientos__error">
          <p className="dc-ayuda">No pudimos cargar los movimientos.</p>
          <Boton variante="secundario" onClick={d.cargarMovimientos}>Reintentar</Boton>
        </div>
      ) : d.movimientos.length === 0 ? (
        <p className="dc-ayuda">Esta cotización todavía no tiene movimientos.</p>
      ) : (
        <ol className="dc-linea">
          {d.movimientos.map((m) => (
            <li key={m.id} className={`dc-linea__item dc-linea__item--${m.tipo}`}>
              <span className="dc-linea__punto" aria-hidden="true" />
              <div className="dc-linea__cuerpo">
                <p className="dc-linea__tipo">{etiquetaMovimiento(m.tipo)}</p>
                {m.detalle && <p className="dc-linea__detalle">{m.detalle}</p>}
                <p className="dc-linea__meta">
                  {quien(m.usuario)} · <time dateTime={m.fecha}>{momento(m.fecha)}</time>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
