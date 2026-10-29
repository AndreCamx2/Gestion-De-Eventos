import { useState } from "react";
import { bloquearCotizacion, liberarBloqueo } from "../../api/cotizaciones";
import FormBloqueo from "../../components/bloqueo/FormBloqueo";
import { AvisoError, Boton } from "../../components/ui";
import { fechaHoraColombia } from "../../utils/fechasBloqueo";
import { textoError } from "../../utils/erroresApi";
import "../../components/bloqueo/bloqueo.css";

// Bloquear la fecha del salón (o liberarla) desde el detalle, igual que en el Rack y
// el Calendario (SGDE-40). Se muestra en una cotizada vigente o en una bloqueada.
// - d: lo que devuelve useDetalleCotizacion; d.reemplazar(cotizacion) pone el detalle
//   nuevo y recarga los movimientos.
export default function PanelBloqueo({ d }) {
  const c = d.cotizacion;
  const [formAbierto, setFormAbierto] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [errorCampo, setErrorCampo] = useState(null);
  const [error, setError] = useState(null);

  async function ejecutar(peticion) {
    setProcesando(true);
    setError(null);
    setErrorCampo(null);
    try {
      d.reemplazar(await peticion());
      setFormAbierto(false);
    } catch (err) {
      if (err.status === 401) d.avisarSesionVencida();
      else if (err.status === 400 && err.body?.bloqueo_hasta) setErrorCampo(textoError(err.body.bloqueo_hasta));
      else if (err.status === 409) setError({ tipo: "conflicto", texto: textoError(err.body?.detail ?? "") });
      else setError({ tipo: "servidor", texto: "No se pudo hacer el cambio. Intenta de nuevo." });
    } finally {
      setProcesando(false);
    }
  }

  const bloqueada = c.estado === "bloqueado";

  return (
    <section className="dc-panel" aria-labelledby="dc-bloqueo-titulo">
      <h2 id="dc-bloqueo-titulo" className="dc-panel__titulo">{bloqueada ? "Fecha bloqueada" : "Bloquear la fecha"}</h2>
      <p className="dc-panel__texto">
        {bloqueada
          ? `El salón queda reservado para este cliente hasta el ${fechaHoraColombia(c.bloqueo_hasta)}. Después se libera solo.`
          : "Aparta el salón ese día mientras el cliente decide. Nadie más podrá bloquearlo ni confirmarlo."}
      </p>

      {bloqueada ? (
        <Boton variante="secundario" disabled={procesando} onClick={() => ejecutar(() => liberarBloqueo(c.id))}>
          {procesando ? "Liberando…" : "Liberar bloqueo"}
        </Boton>
      ) : formAbierto ? (
        <FormBloqueo
          cotizacion={c}
          error={errorCampo}
          procesando={procesando}
          onGuardar={(iso) => ejecutar(() => bloquearCotizacion(c.id, iso))}
          onCancelar={() => setFormAbierto(false)}
        />
      ) : (
        <Boton variante="secundario" onClick={() => setFormAbierto(true)}>Bloquear fecha</Boton>
      )}

      {error && <AvisoError tipo={error.tipo} texto={error.texto} nivel="h3" />}
    </section>
  );
}
