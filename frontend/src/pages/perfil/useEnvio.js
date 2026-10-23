import { useState } from "react";
import { erroresDesdeApi, textoError } from "../../utils/erroresApi";

export function useEnvio({ campos, onSesionVencida }) {
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);

  function limpiarError(campo) {
    setExito(false);
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
  }

  async function enviar(locales, peticion, alTerminar) {
    setExito(false);
    setError(null);
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setGuardando(true);
    try {
      const respuesta = await peticion();
      setExito(true);
      alTerminar(respuesta);
    } catch (err) {
      if (err.status === 400) {
        const resultado = erroresDesdeApi(err.body, campos);
        setErrores(resultado.campos);
        setError(resultado.general);
      } else if (err.status === 401) {
        onSesionVencida();
      } else if (err.status === 429) {
        setError(textoError(err.body?.detail ?? "Hiciste muchos intentos seguidos. Espera un momento."));
      } else if (err.status === 403) {
        setError("No tienes permiso para hacer este cambio.");
      } else {
        setError("No pudimos hablar con el servidor. Inténtalo de nuevo.");
      }
    } finally {
      setGuardando(false);
    }
  }

  return { errores, error, guardando, exito, limpiarError, enviar };
}
