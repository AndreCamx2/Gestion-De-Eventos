import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { listarMisCotizaciones } from "../api/misCotizaciones";
import SesionVencida from "../components/SesionVencida";
import { AvisoError, CabeceraPagina, Esqueleto, EstadoVacio, Tarjeta } from "../components/ui";
import { hoyLocal } from "../utils/inicioCifras";
import { numeroCotizacion, pesos } from "./cotizaciones/cotizaciones";
import {
  estadoCliente, etiquetaCliente, fechaNumerica, separarPorFecha, tipoDeError,
} from "./misCotizaciones/misCotizaciones";
import "../components/ui/EstadoBadge.css";
import "../styles/mis-cotizaciones.css";

// "Mis cotizaciones" del rol cliente (SGDE-127): sus cotizaciones en dos pestañas,
// próximos y realizados. Solo lectura; cada una abre su detalle (SGDE-131).

const PESTANAS = [
  { clave: "proximos", texto: "Próximos", vacio: "No tienes eventos próximos" },
  { clave: "realizados", texto: "Realizados", vacio: "Todavía no tienes eventos realizados" },
];

function FilaCotizacion({ c }) {
  const estado = estadoCliente(c);
  return (
    <li>
      <Link className="mis-cot-fila" to={`/mis-cotizaciones/${c.id}`}>
        <span className="mis-cot-fila__principal">
          <span className="mis-cot-fila__numero">{numeroCotizacion(c.id)}</span>
          <span className="mis-cot-fila__salon">{c.salon_nombre}</span>
          <span className="mis-cot-fila__detalle">
            {c.sitio_nombre} · {c.cantidad_personas} personas
          </span>
        </span>
        <span className="mis-cot-fila__fecha">
          <span className="mis-cot-fila__etiqueta">Evento</span>
          {fechaNumerica(c.fecha_evento)}
        </span>
        <span className="mis-cot-fila__total">
          <span className="mis-cot-fila__etiqueta">Total</span>
          {pesos(Number(c.total))}
        </span>
        <span className={`estado-badge estado-badge--${estado} mis-cot-fila__estado`}>
          <span className="estado-badge__punto" aria-hidden="true" />
          {etiquetaCliente(c)}
        </span>
      </Link>
    </li>
  );
}

export default function MisCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [sesionVencida, setSesionVencida] = useState(false);
  const [pestana, setPestana] = useState("proximos");
  const sesionRef = useRef(null);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    setErrorCarga(null);
    try {
      setCotizaciones(await listarMisCotizaciones());
    } catch (err) {
      const tipo = tipoDeError(err);
      setErrorCarga(tipo);
      if (tipo === "sesion") setSesionVencida(true);
    } finally {
      setCargando(false);
    }
  }

  function alVolverAEntrar() {
    setSesionVencida(false);
    if (errorCarga === "sesion") cargar();
  }

  const grupos = useMemo(
    () => (cotizaciones ? separarPorFecha(cotizaciones, hoyLocal()) : { proximos: [], realizados: [] }),
    [cotizaciones],
  );

  let cuerpo;
  if (cargando && !cotizaciones) {
    cuerpo = <Tarjeta><Esqueleto filas={3} columnas={2} etiqueta="Cargando tus cotizaciones…" /></Tarjeta>;
  } else if (errorCarga === "sinVincular") {
    cuerpo = (
      <Tarjeta>
        <EstadoVacio
          titulo="Tu usuario todavía no está vinculado a un cliente"
          texto="Pídele al administrador que lo vincule para ver tus cotizaciones."
        />
      </Tarjeta>
    );
  } else if (errorCarga === "sesion") {
    cuerpo = (
      <Tarjeta>
        <EstadoVacio titulo="Tu sesión expiró" texto="Vuelve a entrar con el aviso de abajo para ver tus cotizaciones." />
      </Tarjeta>
    );
  } else if (errorCarga === "permiso") {
    cuerpo = <Tarjeta><AvisoError tipo="permiso" titulo="Esta sección es para clientes" /></Tarjeta>;
  } else if (errorCarga || !cotizaciones) {
    cuerpo = <Tarjeta><AvisoError tipo="servidor" onReintentar={cargar} /></Tarjeta>;
  } else if (cotizaciones.length === 0) {
    cuerpo = (
      <Tarjeta>
        <EstadoVacio
          titulo="Todavía no tienes cotizaciones"
          texto="Cuando tu asesor te envíe una propuesta, la verás aquí."
        />
      </Tarjeta>
    );
  } else {
    const actual = PESTANAS.find((p) => p.clave === pestana);
    const lista = grupos[pestana];
    cuerpo = (
      <>
        <div className="mis-cot-pestanas" role="group" aria-label="Qué cotizaciones ver">
          {PESTANAS.map((p) => (
            <button
              key={p.clave}
              type="button"
              className="mis-cot-pestana"
              aria-pressed={pestana === p.clave}
              onClick={() => setPestana(p.clave)}
            >
              {p.texto} <span className="mis-cot-pestana__cuenta">{grupos[p.clave].length}</span>
            </button>
          ))}
        </div>
        {lista.length === 0 ? (
          <Tarjeta><EstadoVacio titulo={actual.vacio} /></Tarjeta>
        ) : (
          <ul className="mis-cot-lista" aria-label={`Cotizaciones: ${actual.texto.toLowerCase()}`}>
            {lista.map((c) => <FilaCotizacion key={c.id} c={c} />)}
          </ul>
        )}
      </>
    );
  }

  return (
    <div className="mis-cotizaciones">
      <CabeceraPagina
        antetitulo="Cliente"
        titulo="Mis cotizaciones"
        subtitulo="Las propuestas que te ha enviado tu asesor y el estado de cada evento."
      />
      {cuerpo}
      <SesionVencida ref={sesionRef} visible={sesionVencida} onReingreso={alVolverAEntrar} />
    </div>
  );
}
