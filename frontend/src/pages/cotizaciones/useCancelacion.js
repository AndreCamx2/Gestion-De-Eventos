import { useEffect, useRef, useState } from "react";
import { cancelarCotizacion } from "../../api/cotizaciones";
import { textoError } from "../../utils/erroresApi";
import { CANCELACION_VACIA, erroresCancelacion, payloadCancelacion, validarCancelacion } from "./cancelacion";

// Estado de la ventana "Cancelar evento" (SGDE-68). Lo usa useDetalleCotizacion.
// - onCancelada(cotizacion): el API respondió el detalle ya cancelado.
// - onRecargar(): tras un 409 la cotización cambió en otro lado; al cerrar se vuelve a pedir.
// - onSesionVencida(): 401; la ventana muestra el aviso de SGDE-94.
// El foco: al cerrar sin cancelar vuelve a "Cancelar evento"; al cancelar va al
// título del panel "Cotización cancelada", que reemplaza al botón.
export function useCancelacion({ cotizacion, onCancelada, onRecargar, onSesionVencida }) {
  const [abierta, setAbierta] = useState(false);
  const [form, setForm] = useState(CANCELACION_VACIA);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [conflicto, setConflicto] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [recienCancelada, setRecienCancelada] = useState(false);
  const botonRef = useRef(null);
  const focoRef = useRef(null);

  useEffect(() => {
    if (abierta || !focoRef.current) return;
    const destino = focoRef.current;
    focoRef.current = null;
    const boton = botonRef.current;
    if (destino === "boton" && boton?.isConnected) boton.focus();
    else document.getElementById("dc-cancelada-titulo")?.focus();
  }, [abierta, cotizacion]);

  function abrir() {
    setForm(CANCELACION_VACIA);
    setErrores({});
    setError(null);
    setConflicto(null);
    setAbierta(true);
  }

  async function cerrar() {
    const huboConflicto = Boolean(conflicto);
    focoRef.current = "boton";
    setAbierta(false);
    if (huboConflicto) {
      // Si la recarga trae la cotización ya cancelada, el botón desaparece y el
      // foco cae en el panel "Cotización cancelada".
      await onRecargar();
      focoRef.current = "boton";
    }
  }

  function cambiar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    const clave = campo === "penalizacion" ? "penalizacion_pct" : campo;
    setErrores((prev) => ({ ...prev, [clave]: undefined }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (guardando) return;
    setError(null);
    const locales = validarCancelacion(form);
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setGuardando(true);
    try {
      const cancelada = await cancelarCotizacion(cotizacion.id, payloadCancelacion(form));
      setGuardando(false);
      setRecienCancelada(true);
      focoRef.current = "panel";
      setAbierta(false);
      onCancelada(cancelada);
    } catch (err) {
      setGuardando(false);
      if (err.status === 400) {
        const { campos, general } = erroresCancelacion(err.body);
        setErrores(campos);
        setError(general);
      } else if (err.status === 409) {
        setConflicto(textoError(err.body?.detail ?? "La cotización ya no está confirmada."));
      } else if (err.status === 401) {
        onSesionVencida();
      } else if (err.status === 403) {
        setError("Solo un administrador puede cancelar un evento.");
      } else if (err.status === 404) {
        setError("Esta cotización ya no existe. Cierra y vuelve a cargar la página.");
      } else {
        setError("No pudimos hablar con el servidor. Inténtalo de nuevo.");
      }
    }
  }

  return {
    abierta, abrir, cerrar, form, cambiar, errores, error, conflicto, guardando, enviar, recienCancelada, botonRef,
  };
}
