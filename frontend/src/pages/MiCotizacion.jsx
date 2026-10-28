import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMiCotizacion } from "../api/misCotizaciones";
import SesionVencida from "../components/SesionVencida";
import { AvisoError, Boton, CabeceraPagina, Esqueleto, EstadoVacio, Tarjeta } from "../components/ui";
import { adaptarCotizacion } from "./cotizaciones/adaptarCotizacion";
import CotizacionImprimible from "./cotizaciones/CotizacionImprimible";
import { numeroCotizacion } from "./cotizaciones/cotizaciones";
import { avisoDeEstado, estadoCliente, etiquetaCliente, tipoDeError } from "./misCotizaciones/misCotizaciones";
import "../styles/cotizacion-imprimible.css";
import "../components/ui/EstadoBadge.css";
import "../styles/mis-cotizaciones.css";

// Detalle de una cotización para el rol cliente (SGDE-131): aviso según el estado y
// la misma hoja de la cotización que se imprime. Solo lectura, sin datos internos.

function Volver() {
  return (
    <Link className="mis-cot-volver" to="/mis-cotizaciones">
      ← Volver a mis cotizaciones
    </Link>
  );
}

export default function MiCotizacion() {
  const { id } = useParams();
  const [cotizacion, setCotizacion] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [sesionVencida, setSesionVencida] = useState(false);
  const [intento, setIntento] = useState(0);
  const sesionRef = useRef(null);

  useEffect(() => {
    let vigente = true;
    setCotizacion(null);
    setErrorCarga(null);
    getMiCotizacion(id)
      .then((data) => {
        if (vigente) setCotizacion(data);
      })
      .catch((err) => {
        if (!vigente) return;
        const tipo = tipoDeError(err);
        setErrorCarga(tipo);
        if (tipo === "sesion") setSesionVencida(true);
      });
    return () => {
      vigente = false;
    };
  }, [id, intento]);

  function alVolverAEntrar() {
    setSesionVencida(false);
    if (errorCarga === "sesion") setIntento((n) => n + 1);
  }

  let contenido;
  if (errorCarga === "noExiste") {
    contenido = (
      <Tarjeta>
        <EstadoVacio
          titulo="Esta cotización no existe"
          texto="Puede que el enlace esté mal o que no sea una de tus cotizaciones."
          accion={<Boton as={Link} to="/mis-cotizaciones" variante="secundario">Ver mis cotizaciones</Boton>}
        />
      </Tarjeta>
    );
  } else if (errorCarga === "sesion") {
    contenido = (
      <Tarjeta>
        <EstadoVacio titulo="Tu sesión expiró" texto="Vuelve a entrar con el aviso de abajo para ver la cotización." />
      </Tarjeta>
    );
  } else if (errorCarga === "sinVincular") {
    contenido = (
      <Tarjeta>
        <EstadoVacio
          titulo="Tu usuario todavía no está vinculado a un cliente"
          texto="Pídele al administrador que lo vincule para ver tus cotizaciones."
        />
      </Tarjeta>
    );
  } else if (errorCarga === "permiso") {
    contenido = <Tarjeta><AvisoError tipo="permiso" titulo="Esta sección es para clientes" /></Tarjeta>;
  } else if (errorCarga) {
    contenido = <Tarjeta><AvisoError tipo="servidor" onReintentar={() => setIntento((n) => n + 1)} /></Tarjeta>;
  } else if (!cotizacion) {
    contenido = <Tarjeta><Esqueleto filas={4} columnas={2} etiqueta="Cargando la cotización…" /></Tarjeta>;
  }

  if (contenido) {
    return (
      <div className="mis-cotizaciones">
        <Volver />
        <CabeceraPagina antetitulo="Mis cotizaciones" titulo="Cotización" />
        {contenido}
        <SesionVencida ref={sesionRef} visible={sesionVencida} onReingreso={alVolverAEntrar} />
      </div>
    );
  }

  const estado = estadoCliente(cotizacion);
  const aviso = avisoDeEstado(cotizacion);

  return (
    <div className="mis-cotizaciones">
      <Volver />
      <CabeceraPagina
        antetitulo="Mis cotizaciones"
        titulo={`Cotización ${numeroCotizacion(cotizacion.id)}`}
        subtitulo={[cotizacion.salon?.nombre, cotizacion.sitio?.nombre].filter(Boolean).join(" · ")}
        acciones={
          <Boton as={Link} to={`/mis-cotizaciones/${cotizacion.id}/imprimir`} variante="secundario">
            Descargar PDF
          </Boton>
        }
      />

      <section className={`mis-cot-aviso mis-cot-aviso--${aviso.tono}`} aria-label="Estado de la cotización">
        <span className={`estado-badge estado-badge--${estado}`}>
          <span className="estado-badge__punto" aria-hidden="true" />
          {etiquetaCliente(cotizacion)}
        </span>
        <p className="mis-cot-aviso__texto">{aviso.texto}</p>
      </section>

      <div className="mis-cot-hoja">
        <CotizacionImprimible cotizacion={adaptarCotizacion(cotizacion)} nivelTitulo="h2" />
      </div>
      <SesionVencida ref={sesionRef} visible={sesionVencida} onReingreso={alVolverAEntrar} />
    </div>
  );
}
