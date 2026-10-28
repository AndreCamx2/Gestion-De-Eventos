import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCotizacion } from "../api/cotizaciones";
import { adaptarCotizacion } from "./cotizaciones/adaptarCotizacion";
import CotizacionImprimible from "./cotizaciones/CotizacionImprimible";
import "../styles/cotizacion-imprimible.css";

function mensajeError(error) {
  if (error.status === 401) return "Tu sesión expiró. Inicia sesión nuevamente.";
  if (error.status === 403) return "No tienes permiso para consultar esta cotización.";
  if (error.status === 404) return "No encontramos esta cotización.";
  return "No pudimos cargar la cotización. Inténtalo de nuevo.";
}

// El cliente usa esta misma página con su propio endpoint y su detalle (SGDE-131).
export default function ImprimirCotizacion({ cargar = getCotizacion, rutaDetalle = (id) => `/cotizaciones/${id}` }) {
  const { id } = useParams();
  const [cotizacion, setCotizacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    setCotizacion(null);
    setCargando(true);
    setError(null);

    cargar(id)
      .then((data) => {
        if (vigente) setCotizacion(adaptarCotizacion(data));
      })
      .catch((fallo) => {
        if (vigente) setError(mensajeError(fallo));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [cargar, id, intento]);

  return (
    <main className="pagina-cotizacion-imprimible">
      <nav className="cotizacion-imprimible-acciones no-imprimir" aria-label="Acciones de impresión">
        <Link className="cotizacion-imprimible-volver" to={rutaDetalle(id)}>
          Volver a la cotización
        </Link>
        <button
          className="cotizacion-imprimible-imprimir"
          type="button"
          disabled={!cotizacion}
          onClick={() => window.print()}
        >
          Imprimir o guardar como PDF
        </button>
      </nav>

      {cargando && <p className="cotizacion-imprimible-estado" role="status">Cargando cotización…</p>}
      {error && (
        <section className="cotizacion-imprimible-estado" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setIntento((actual) => actual + 1)}>
            Reintentar
          </button>
        </section>
      )}
      {cotizacion && <CotizacionImprimible cotizacion={cotizacion} />}
    </main>
  );
}
