import { Link } from "react-router-dom";
import { Esqueleto, EstadoBadge, EstadoVacio, Tarjeta } from "../../components/ui";
import { mesCorto } from "../../utils/inicioCifras";
import { AvisoBloque } from "./AvisosBloque";
import { MAX_AGENDA, plural, puedeEntrar } from "./inicio";

const ETIQUETAS_CONTEO = {
  confirmado: ["confirmado", "confirmados"],
  bloqueado: ["bloqueado", "bloqueados"],
  cotizado: ["cotizado", "cotizados"],
  vencida: ["vencida", "vencidas"],
};

// Como la maqueta: en la agenda, este aviso va en lugar de las personas.
function textoVence(dias) {
  if (dias === 0) return "la oferta vence hoy";
  if (dias === 1) return "la oferta vence mañana";
  return `la oferta vence en ${dias} días`;
}

export default function Agenda({ rol, calendario, agenda, onReintentar }) {
  const visibles = agenda.slice(0, MAX_AGENDA);
  const restantes = agenda.length - visibles.length;
  const conteos = Object.keys(ETIQUETAS_CONTEO)
    .map((estado) => ({ estado, cantidad: agenda.filter((e) => e.estadoVisible === estado).length }))
    .filter((c) => c.cantidad > 0);
  const puedeVerCalendario = puedeEntrar("/calendario", rol);
  // Cada evento abre el detalle de su cotización (el id del calendario es el de la cotización).
  const puedeVerCotizaciones = puedeEntrar("/cotizaciones", rol);

  return (
    <Tarjeta as="section" className="inicio-bloque inicio-agenda" aria-labelledby="inicio-agenda-titulo">
      <div className="inicio-bloque__cabecera">
        <h2 id="inicio-agenda-titulo" className="inicio-bloque__titulo">Agenda de las próximas semanas</h2>
        {conteos.length > 0 && (
          <ul className="inicio-agenda__conteos" aria-label="Eventos por estado">
            {conteos.map(({ estado, cantidad }) => (
              <li key={estado} className={`inicio-conteo inicio-conteo--${estado}`}>
                {plural(cantidad, ...ETIQUETAS_CONTEO[estado])}
              </li>
            ))}
          </ul>
        )}
        {puedeVerCalendario && calendario.fase === "listo" && agenda.length > 0 && (
          <Link to="/calendario" className="inicio-enlace">Ver todo</Link>
        )}
      </div>

      {calendario.fase === "cargando" && <Esqueleto filas={4} columnas={1} etiqueta="Cargando la agenda…" />}

      {calendario.fase === "error" && (
        <AvisoBloque
          error={calendario.error}
          texto="No se pudo cargar la agenda. Revisa tu conexión y vuelve a intentarlo."
          onReintentar={onReintentar}
        />
      )}

      {calendario.fase === "listo" && agenda.length === 0 && (
        <EstadoVacio
          nivel="h3"
          titulo="Sin eventos en los próximos 30 días"
          texto="Cuando haya cotizaciones con fecha en este periodo, aparecerán aquí."
        />
      )}

      {visibles.length > 0 && (
        <ol className="inicio-agenda__lista">
          {visibles.map((e) => {
            const cuerpo = (
              <>
                <div className="inicio-evento__textos">
                  <p className="inicio-evento__cliente">{e.cliente_nombre}</p>
                  <p className={`inicio-evento__detalle ${e.venceEn !== null ? "inicio-evento__detalle--alerta" : ""}`}>
                    {e.salon_nombre} · {e.montaje_nombre} ·{" "}
                    {e.venceEn !== null ? textoVence(e.venceEn) : plural(e.cantidad_personas, "persona", "personas")}
                  </p>
                </div>
                <EstadoBadge estado={e.estadoVisible} />
              </>
            );
            return (
              <li key={e.id} className="inicio-evento">
                <time className="inicio-evento__fecha" dateTime={e.fecha_evento}>
                  <span className="inicio-evento__dia">{e.fecha.getDate()}</span>
                  <span className="inicio-evento__mes">{mesCorto(e.fecha)}</span>
                </time>
                <span className={`inicio-evento__punto inicio-evento__punto--${e.estadoVisible}`} aria-hidden="true" />
                {puedeVerCotizaciones ? (
                  <Link to={`/cotizaciones/${e.id}`} className="inicio-evento__cuerpo inicio-evento__cuerpo--enlace">
                    {cuerpo}
                  </Link>
                ) : (
                  <div className="inicio-evento__cuerpo">{cuerpo}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {restantes > 0 && (
        <p className="inicio-agenda__mas">
          Y {plural(restantes, "evento más", "eventos más")} en los próximos 30 días.
        </p>
      )}
    </Tarjeta>
  );
}
