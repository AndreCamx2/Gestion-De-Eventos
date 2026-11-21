import { useState } from "react";
import { solicitarRecuperacion } from "../../api/auth";
import { mensajeGeneral, unirMensajes, validarCorreo } from "./recuperacion";

export default function useRecuperarClave() {
  const [error, setError] = useState(null);
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar(email) {
    const errorCorreo = validarCorreo(email);
    setError(errorCorreo);
    setErrorGeneral(null);
    if (errorCorreo) return;

    setEnviando(true);
    try {
      await solicitarRecuperacion(email);
      setEnviado(true);
    } catch (err) {
      if (err.status === 400 && err.body?.email) {
        setError(unirMensajes(err.body.email));
      } else {
        setErrorGeneral(mensajeGeneral(err));
      }
    } finally {
      setEnviando(false);
    }
  }

  return { error, errorGeneral, enviando, enviado, enviar };
}
