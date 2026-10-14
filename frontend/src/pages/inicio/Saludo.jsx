import { Link } from "react-router-dom";
import { Boton, Esqueleto, Tarjeta } from "../../components/ui";
import {
  dineroAbreviado,
  dineroCompleto,
  fechaLarga,
  numero,
  resumenPorConfirmar,
  saludoPorHora,
} from "../../utils/inicioCifras";
import { AvisoBloque } from "./AvisosBloque";
import { plural, puedeEntrar } from "./inicio";

// Dinero abreviado a la vista ("$ 184,6 M"); la cifra exacta, para el lector de
// pantalla y al pasar el mouse.
function Dinero({ valor }) {
  const completo = dineroCompleto(valor);
  const corto = dineroAbreviado(valor);
  if (corto === completo) return completo;
  return (
    <span title={completo}>
      <span aria-hidden="true">{corto}</span>
      <span className="visually-hidden">{completo}</span>
    </span>
  );
}

function textoVencen(cantidad) {
  if (cantidad === 0) return "Ninguna vence esta semana";
  return cantidad === 1 ? "1 vence esta semana" : `${numero(cantidad)} vencen esta semana`;
}

// Saludo con el resumen. En escritorio es la frase de la maqueta de Inicio; en
// teléfono (Movil) el título es corto y las cifras van en la tarjeta oscura.
// Las dos variantes se alternan con CSS (display: none), así no se leen dos veces.
export default function Saludo({ hoy, nombre, rol, cotizaciones, onReintentar }) {
  const resumen = cotizaciones.fase === "listo" ? resumenPorConfirmar(cotizaciones.datos, hoy) : null;
  const puedeNuevaCotizacion = puedeEntrar("/cotizaciones/nueva", rol);
  const puedeVerCotizaciones = puedeEntrar("/cotizaciones", rol);

  let frase = null;
  if (resumen && resumen.cantidad === 0) {
    frase = " No tienes cotizaciones por confirmar.";
  } else if (resumen) {
    frase = (
      <>
        {" "}Tienes{" "}
        <span className="inicio-resaltado inicio-resaltado--durazno">
          {plural(resumen.cantidad, "cotización", "cotizaciones")}
        </span>{" "}
        por confirmar, que {resumen.cantidad === 1 ? "suma" : "suman"}{" "}
        <span className="inicio-resaltado inicio-resaltado--mantequilla">
          <Dinero valor={resumen.total} />
        </span>
        .
        {resumen.vencenSemana > 0 && (
          <span className="inicio-saludo__alerta"> {textoVencen(resumen.vencenSemana)}.</span>
        )}
      </>
    );
  }

  const tarjetaContenido = resumen && (
    <>
      <span className="inicio-por-confirmar__textos">
        <span className="inicio-por-confirmar__etiqueta">Por confirmar</span>
        <span className="inicio-por-confirmar__cifra">{numero(resumen.cantidad)}</span>
      </span>
      <span className="inicio-por-confirmar__detalle">
        <span className="inicio-por-confirmar__dinero"><Dinero valor={resumen.total} /></span>
        <span>{textoVencen(resumen.vencenSemana)}</span>
      </span>
    </>
  );

  return (
    <section className="inicio-saludo" aria-labelledby="inicio-saludo-titulo">
      <span className="inicio-saludo__circulo inicio-saludo__circulo--grande" aria-hidden="true" />
      <span className="inicio-saludo__circulo inicio-saludo__circulo--pequeno" aria-hidden="true" />

      <div className="inicio-saludo__textos">
        <p className="inicio-saludo__fecha">
          <span className="inicio-saludo__punto" aria-hidden="true" />
          {fechaLarga(hoy)}
        </p>
        <h1 id="inicio-saludo-titulo" className="inicio-saludo__titulo">
          <span className="inicio-solo-escritorio">Hola, {nombre}.{frase}</span>
          <span className="inicio-solo-movil">{saludoPorHora(new Date().getHours())}, {nombre}</span>
        </h1>

        {cotizaciones.fase === "cargando" && (
          <Esqueleto filas={1} avatar={false} etiqueta="Cargando el resumen…" className="inicio-saludo__esqueleto" />
        )}
        {cotizaciones.fase === "error" && (
          <Tarjeta className="inicio-saludo__error">
            <AvisoBloque
              nivel="h2"
              error={cotizaciones.error}
              texto="No se pudieron cargar las cotizaciones. El resto del inicio sigue disponible."
              onReintentar={onReintentar}
            />
          </Tarjeta>
        )}

        {/* Solo en teléfono: tarjeta oscura con las cifras (maqueta Movil). */}
        {resumen &&
          (puedeVerCotizaciones ? (
            <Link to="/cotizaciones" className="inicio-por-confirmar inicio-solo-movil">
              {tarjetaContenido}
            </Link>
          ) : (
            <div className="inicio-por-confirmar inicio-solo-movil">{tarjetaContenido}</div>
          ))}
      </div>

      {/* "Nueva cotización" queda deshabilitado hasta que exista su pantalla (SGDE-47). */}
      {puedeNuevaCotizacion && (
        <div className="inicio-saludo__accion">
          <Boton variante="principal" disabled aria-describedby="inicio-nueva-nota">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva cotización
          </Boton>
          <p id="inicio-nueva-nota" className="inicio-saludo__nota">Disponible pronto</p>
        </div>
      )}
    </section>
  );
}
