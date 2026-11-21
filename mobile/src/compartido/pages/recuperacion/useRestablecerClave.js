import { useState } from "react";
import { restablecerClave } from "../../api/auth";
import { mensajeGeneral, unirMensajes, validarClaves } from "./recuperacion";

export default function useRestablecerClave(uid, token) {
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [enlaceInvalido, setEnlaceInvalido] = useState(!uid || !token);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar(password, confirmacion) {
    const siguientes = validarClaves(password, confirmacion);
    setErrores(siguientes);
    setErrorGeneral(null);
    if (Object.keys(siguientes).length > 0) return;

    setEnviando(true);
    try {
      await restablecerClave({ uid, token, password });
      setListo(true);
    } catch (err) {
      if (err.status === 400 && err.body?.password) {
        setErrores({ password: unirMensajes(err.body.password) });
      } else if (err.status === 400) {
        setEnlaceInvalido(true);
      } else {
        setErrorGeneral(mensajeGeneral(err));
      }
    } finally {
      setEnviando(false);
    }
  }

  return { errores, errorGeneral, enlaceInvalido, enviando, listo, enviar };
}
