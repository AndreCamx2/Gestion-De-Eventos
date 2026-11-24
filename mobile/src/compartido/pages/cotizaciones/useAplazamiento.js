import { useEffect, useRef, useState } from "react";
import { aplazarCotizacion } from "../../api/cotizaciones";
import { textoError } from "../../utils/erroresApi";
import { APLAZAMIENTO_VACIO, erroresAplazamiento, payloadAplazamiento, validarAplazamiento } from "./aplazamiento";

// Estado de la ventana "Aplazar fecha". Mismo contrato que useCancelacion:
// - onAplazada(cotizacion): el API respondió el detalle con la fecha nueva.
// - onRecargar(): tras un 409 se vuelve a pedir la cotización al cerrar.
// - onSesionVencida(): 401; la ventana muestra el aviso de SGDE-94.
// Al cerrar, el foco vuelve al botón "Aplazar fecha".
export function useAplazamiento({ cotizacion, onAplazada, onRecargar, onSesionVencida }) {
  const [abierta, setAbierta] = useState(false);
  const [form, setForm] = useState(APLAZAMIENTO_VACIO);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [conflicto, setConflicto] = useState(null);
  const [guardando, setGuardando] = useState(false);
  // La fecha anterior, para el aviso "El evento pasó del … al …".
  const [recienAplazada, setRecienAplazada] = useState(null);
  const botonRef = useRef(null);
  const focoRef = useRef(false);

  useEffect(() => {
    if (abierta || !focoRef.current) return;
    focoRef.current = false;
    if (botonRef.current?.isConnected) botonRef.current.focus();
  }, [abierta, cotizacion]);

  function abrir() {
    setForm(APLAZAMIENTO_VACIO);
    setErrores({});
    setError(null);
    setConflicto(null);
    setAbierta(true);
  }

  async function cerrar() {
    const huboConflicto = Boolean(conflicto);
    focoRef.current = true;
    setAbierta(false);
    if (huboConflicto) {
      await onRecargar();
      focoRef.current = true;
    }
  }

  function cambiar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    const clave = campo === "fecha" ? "fecha_evento" : campo;
    setErrores((prev) => ({ ...prev, [clave]: undefined }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (guardando) return;
    setError(null);
    const locales = validarAplazamiento(form, cotizacion);
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setGuardando(true);
    try {
      const anterior = cotizacion.fecha_evento;
      const aplazada = await aplazarCotizacion(cotizacion.id, payloadAplazamiento(form));
      setGuardando(false);
      setRecienAplazada(anterior);
      focoRef.current = true;
      setAbierta(false);
      onAplazada(aplazada);
    } catch (err) {
      setGuardando(false);
      if (err.status === 400) {
        const { campos, general } = erroresAplazamiento(err.body);
        setErrores(campos);
        setError(general);
      } else if (err.status === 409) {
        setConflicto(textoError(err.body?.detail ?? "No se pudo aplazar: la cotización cambió."));
      } else if (err.status === 401) {
        onSesionVencida();
      } else if (err.status === 403) {
        setError("Solo un administrador puede aplazar un evento.");
      } else if (err.status === 404) {
        setError("Esta cotización ya no existe. Cierra y vuelve a cargar la página.");
      } else {
        setError("No pudimos hablar con el servidor. Inténtalo de nuevo.");
      }
    }
  }

  return {
    abierta, abrir, cerrar, form, cambiar, errores, error, conflicto, guardando, enviar, recienAplazada, botonRef,
  };
}
