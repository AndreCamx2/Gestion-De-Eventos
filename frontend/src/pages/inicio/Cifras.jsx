import { Esqueleto, Tarjeta } from "../../components/ui";
import { confirmadosDelMes, mesCorto, nombreMes, numero, tasaDeCierre } from "../../utils/inicioCifras";
import { SinDatos } from "./AvisosBloque";
import { plural } from "./inicio";

// Tarjetas de cifras del lateral del Inicio: confirmados del mes y tasa de cierre.
export function Confirmados({ hoy, cotizaciones }) {
  const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const listo = cotizaciones.fase === "listo";
  const actual = listo ? confirmadosDelMes(cotizaciones.datos, hoy) : 0;
  const anterior = listo ? confirmadosDelMes(cotizaciones.datos, mesAnterior) : 0;
  const diferencia = actual - anterior;
  const corto = mesCorto(mesAnterior);

  let comparacion;
  let comparacionLeida;
  if (diferencia > 0) {
    comparacion = `+${numero(diferencia)} vs. ${corto}.`;
    comparacionLeida = `${numero(diferencia)} más que en ${nombreMes(mesAnterior)}`;
  } else if (diferencia < 0) {
    comparacion = `−${numero(-diferencia)} vs. ${corto}.`;
    comparacionLeida = `${numero(-diferencia)} menos que en ${nombreMes(mesAnterior)}`;
  } else {
    comparacion = `Igual que ${corto}.`;
    comparacionLeida = `Igual que en ${nombreMes(mesAnterior)}`;
  }
  const tono = diferencia > 0 ? "sube" : diferencia < 0 ? "baja" : "igual";

  return (
    <Tarjeta as="section" className="inicio-cifra" aria-labelledby="inicio-confirmados-titulo">
      <span className="inicio-cifra__icono inicio-cifra__icono--exito" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <div className="inicio-cifra__textos">
        <h2 id="inicio-confirmados-titulo" className="inicio-cifra__titulo">
          Eventos confirmados de {nombreMes(hoy)}
        </h2>
        {cotizaciones.fase === "cargando" && <Esqueleto filas={1} avatar={false} etiqueta="Cargando…" />}
        {cotizaciones.fase === "error" && <SinDatos>Sin datos: no se pudieron cargar las cotizaciones.</SinDatos>}
        {listo && (
          <p className="inicio-cifra__valor">
            {numero(actual)}
            <span className={`inicio-cifra__comparacion inicio-cifra__comparacion--${tono}`}>
              <span aria-hidden="true">{comparacion}</span>
              <span className="visually-hidden">{comparacionLeida}</span>
            </span>
          </p>
        )}
      </div>
    </Tarjeta>
  );
}

export function TasaCierre({ hoy, cotizaciones }) {
  const tasa = cotizaciones.fase === "listo" ? tasaDeCierre(cotizaciones.datos, hoy) : null;
  const mes = nombreMes(hoy);

  return (
    <Tarjeta as="section" className="inicio-cifra" aria-labelledby="inicio-tasa-titulo">
      <span className="inicio-cifra__icono inicio-cifra__icono--calido" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 17l5-5 4 4 7-8" />
          <path d="M15 8h5v5" />
        </svg>
      </span>
      <div className="inicio-cifra__textos">
        <h2 id="inicio-tasa-titulo" className="inicio-cifra__titulo">Tasa de cierre</h2>
        {cotizaciones.fase === "cargando" && <Esqueleto filas={1} avatar={false} etiqueta="Cargando…" />}
        {cotizaciones.fase === "error" && <SinDatos>Sin datos: no se pudieron cargar las cotizaciones.</SinDatos>}
        {tasa && (
          <>
            <p className="inicio-cifra__valor">{tasa.porcentaje === null ? "—" : `${tasa.porcentaje}%`}</p>
            <p className="inicio-cifra__nota">
              {tasa.porcentaje === null
                ? `Ninguna cotización se ha resuelto en ${mes}.`
                : `Confirmadas de ${plural(tasa.resueltas, "cotización resuelta", "cotizaciones resueltas")} en ${mes}.`}
            </p>
          </>
        )}
      </div>
    </Tarjeta>
  );
}
