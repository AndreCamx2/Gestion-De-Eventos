import { useEffect, useRef, useState } from "react";
import { anularCotizacion } from "../../api/cotizaciones";
import { textoError } from "../../utils/erroresApi";

// Estado de la ventana "Anular cotización": descarta una cotizada o bloqueada que el
// cliente no tomó. Mismo contrato que useCancelacion (SGDE-68):
// - onAnulada(cotizacion): el API respondió el detalle ya cancelado.
// - onRecargar(): tras un 409 la cotización cambió en otro lado; al cerrar se vuelve a pedir.
// - onSesionVencida(): 401; la ventana muestra el aviso de SGDE-94.
// El foco: al cerrar sin anular vuelve al botón; al anular, al título del panel cancelado.
export function useAnulacion({ cotizacion, onAnulada, onRecargar, onSesionVencida }) {
  const [abierta, setAbierta] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState(null);
  const [error, setError] = useState(null);
  const [conflicto, setConflicto] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [recienAnulada, setRecienAnulada] = useState(false);
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
    setMotivo("");
    setErrorMotivo(null);
    setError(null);
    setConflicto(null);
    setAbierta(true);
  }

  async function cerrar() {
    const huboConflicto = Boolean(conflicto);
    focoRef.current = "boton";
    setAbierta(false);
    if (huboConflicto) {
      await onRecargar();
      focoRef.current = "boton";
    }
  }

  function cambiar(valor) {
    setMotivo(valor);
    setErrorMotivo(null);
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (guardando) return;
    setError(null);
    if (!motivo.trim()) {
      setErrorMotivo("Escribe el motivo de la anulación.");
      return;
    }

    setGuardando(true);
    try {
      const anulada = await anularCotizacion(cotizacion.id, motivo.trim());
      setGuardando(false);
      setRecienAnulada(true);
      focoRef.current = "panel";
      setAbierta(false);
      onAnulada(anulada);
    } catch (err) {
      setGuardando(false);
      if (err.status === 400) {
        setErrorMotivo(err.body?.motivo ? textoError(err.body.motivo) : null);
        if (!err.body?.motivo) setError(textoError(err.body?.detail ?? "Revisa los datos."));
      } else if (err.status === 409) {
        setConflicto(textoError(err.body?.detail ?? "La cotización ya no se puede anular."));
      } else if (err.status === 401) {
        onSesionVencida();
      } else if (err.status === 403) {
        setError("Solo un administrador puede anular una cotización.");
      } else if (err.status === 404) {
        setError("Esta cotización ya no existe. Cierra y vuelve a cargar la página.");
      } else {
        setError("No pudimos hablar con el servidor. Inténtalo de nuevo.");
      }
    }
  }

  return {
    abierta, abrir, cerrar, motivo, cambiar, errorMotivo, error, conflicto, guardando, enviar, recienAnulada, botonRef,
  };
}
