import { AvisoError, CabeceraPagina, Esqueleto, EstadoVacio, Tarjeta } from "../components/ui";
import SesionVencida from "../components/SesionVencida";
import { millones, pesos } from "./cotizaciones/cotizaciones";
import { AGRUPACIONES, PERIODOS, porcentaje, textoEventos } from "./ingresos/ingresos";
import { useIngresos } from "./ingresos/useIngresos";
import "../styles/cotizaciones.css";
import "../styles/ingresos.css";

// "¿Qué eventos generan más ingresos?" (SGDE-145). Muestra los ingresos de los
// eventos confirmados, agrupados por grupo o por tipo de evento (SGDE-142), con
// los datos de GET /api/reportes/ingresos-por-tipo-evento/ (SGDE-144).

function Botonera({ etiqueta, opciones, valor, onCambiar }) {
  return (
    <div className="cotizaciones-estados" role="group" aria-label={etiqueta}>
      {opciones.map(({ clave, texto }) => (
        <button
          key={clave}
          type="button"
          className="cotizaciones-estado"
          aria-pressed={valor === clave}
          onClick={() => onCambiar(clave)}
        >
          {texto}
        </button>
      ))}
    </div>
  );
}

function Filtros({ r }) {
  return (
    <div className="ingresos-filtros">
      <div className="ingresos-filtro">
        <span className="ingresos-filtro__etiqueta">Ver por</span>
        <Botonera etiqueta="Ver por" opciones={AGRUPACIONES} valor={r.agrupar} onCambiar={r.setAgrupar} />
      </div>
      <div className="ingresos-filtro">
        <span className="ingresos-filtro__etiqueta">Periodo</span>
        <Botonera etiqueta="Periodo" opciones={PERIODOS} valor={r.periodo} onCambiar={r.setPeriodo} />
      </div>
      {r.periodo === "rango" && (
        <div className="cotizaciones-campos">
          <label className="cotizaciones-fecha">
            <span className="cotizaciones-fecha__etiqueta">Evento desde</span>
            <input
              type="date"
              className="cotizaciones-fecha__input"
              value={r.rango.desde}
              max={r.rango.hasta || undefined}
              onChange={(e) => r.cambiarRango("desde", e.target.value)}
            />
          </label>
          <label className="cotizaciones-fecha">
            <span className="cotizaciones-fecha__etiqueta">hasta</span>
            <input
              type="date"
              className="cotizaciones-fecha__input"
              value={r.rango.hasta}
              min={r.rango.desde || undefined}
              onChange={(e) => r.cambiarRango("hasta", e.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
}

function Cifras({ datos, visibles }) {
  const valor = (texto) => (visibles ? texto : "—");
  return (
    <section className="cotizaciones-cifras ingresos-cifras" aria-label="Resumen del periodo">
      <div className="cotizaciones-cifra">
        <p className="cotizaciones-cifra__etiqueta">Ingresos</p>
        <p className="cotizaciones-cifra__valor cotizaciones-cifra__valor--verde">{valor(millones(datos.totalIngresos))}</p>
        <p className="cotizaciones-cifra__nota">De los eventos confirmados</p>
      </div>
      <div className="cotizaciones-cifra">
        <p className="cotizaciones-cifra__etiqueta">Eventos</p>
        <p className="cotizaciones-cifra__valor">{valor(datos.totalEventos)}</p>
        <p className="cotizaciones-cifra__nota">Confirmados en el periodo</p>
      </div>
      <div className="cotizaciones-cifra">
        <p className="cotizaciones-cifra__etiqueta">Ticket promedio</p>
        <p className="cotizaciones-cifra__valor">{valor(millones(datos.ticketPromedio))}</p>
        <p className="cotizaciones-cifra__nota">Ingreso por evento</p>
      </div>
    </section>
  );
}

function Barras({ filas, agrupar }) {
  return (
    <Tarjeta as="section" className="ingresos-grafico" aria-label="Ingresos de mayor a menor">
      <ol className="ingresos-lista">
        {filas.map((f, i) => (
          <li key={f.clave} className="ingresos-fila">
            <div className="ingresos-fila__cabeza">
              <p className="ingresos-fila__nombre">
                <span className="ingresos-fila__puesto">{i + 1}</span>
                <span>
                  {f.nombre}
                  {agrupar === "tipo" && f.grupo && <span className="ingresos-fila__grupo">{f.grupo}</span>}
                </span>
              </p>
              <p className="ingresos-fila__monto">{pesos(f.ingresos)}</p>
            </div>
            <div className="ingresos-fila__pista" aria-hidden="true">
              <span
                className={`ingresos-fila__barra${f.clave === "sin-clasificar" ? " ingresos-fila__barra--sin" : ""}`}
                style={{ width: `${Math.max(f.ancho, 1.5)}%` }}
              />
            </div>
            <dl className="ingresos-fila__datos">
              <div>
                <dt>Eventos</dt>
                <dd>{textoEventos(f.eventos)}</dd>
              </div>
              <div>
                <dt>Del total</dt>
                <dd>{porcentaje(f.porcentaje)}</dd>
              </div>
              <div>
                <dt>Ticket promedio</dt>
                <dd>{pesos(f.ticketPromedio)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
    </Tarjeta>
  );
}

function Resultado({ r }) {
  if (r.error === "sesion") {
    return (
      <Tarjeta>
        <EstadoVacio titulo="Tu sesión expiró" texto="Vuelve a entrar con el aviso de abajo para ver los ingresos." />
      </Tarjeta>
    );
  }
  if (r.error === "filtros") {
    return (
      <Tarjeta>
        <EstadoVacio titulo="Revisa el periodo" texto={r.textoError} />
      </Tarjeta>
    );
  }
  if (r.error) {
    return (
      <Tarjeta>
        <AvisoError tipo={r.error} onReintentar={r.cargar} />
      </Tarjeta>
    );
  }
  if (r.cargando) {
    return (
      <Tarjeta>
        <Esqueleto filas={4} avatar={false} columnas={1} etiqueta="Cargando los ingresos…" />
      </Tarjeta>
    );
  }
  if (r.datos.filas.length === 0) {
    return (
      <Tarjeta>
        <EstadoVacio
          titulo="No hay eventos confirmados en este periodo"
          texto="Cuando se confirme un evento, aquí verás cuánto deja cada tipo. Prueba con otro periodo."
        />
      </Tarjeta>
    );
  }
  return <Barras filas={r.datos.filas} agrupar={r.agrupar} />;
}

export default function Ingresos() {
  const r = useIngresos();
  return (
    <div className="cotizaciones-pv">
      <CabeceraPagina
        antetitulo="Reportes"
        titulo="¿Qué eventos generan más ingresos?"
        subtitulo="Ingresos de los eventos confirmados, de mayor a menor."
      />
      <Filtros r={r} />
      <Cifras datos={r.datos} visibles={!r.cargando && !r.error} />
      <Resultado r={r} />
      <SesionVencida visible={r.sesionVencida} onReingreso={r.alVolverAEntrar} />
    </div>
  );
}
