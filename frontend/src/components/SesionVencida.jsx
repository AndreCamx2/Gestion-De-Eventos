import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { login } from "../api/auth";
import { AvisoSesion, Boton, Campo } from "./ui";
import "./SesionVencida.css";

// Lee el user_id de un JWT (la parte del medio es JSON en base64url).
// No valida la firma: solo se usa para comparar quién estaba y quién entró.
function idDeUsuario(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const id = JSON.parse(atob(payload)).user_id;
    return id == null ? null : String(id);
  } catch {
    return null;
  }
}

export function AvisoSesionEnVentana({ onEntrar }) {
  return (
    <div className="aviso-sesion-ventana" role="alert">
      <p className="aviso-sesion-ventana__texto">
        Tu sesión expiró. Lo que escribiste sigue aquí: vuelve a entrar y luego inténtalo otra vez.
      </p>
      <Boton variante="secundario" onClick={onEntrar}>
        Entrar de nuevo
      </Boton>
    </div>
  );
}

export default function SesionVencida({ visible, onReingreso, ref }) {
  const dialogoRef = useRef(null);
  const focoPrevioRef = useRef(null);
  const [errorIngreso, setErrorIngreso] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (visible) focoPrevioRef.current = document.activeElement;
  }, [visible]);

  function abrir({ focoAlVolver } = {}) {
    if (focoAlVolver) focoPrevioRef.current = focoAlVolver;
    setErrorIngreso(null);
    dialogoRef.current?.showModal();
  }

  useImperativeHandle(ref, () => ({ abrir }));

  async function handleSubmit(event) {
    event.preventDefault();
    const datos = new FormData(event.target);
    const usuario = datos.get("usuario")?.toString().trim();
    const clave = datos.get("clave")?.toString();
    if (!usuario || !clave) {
      setErrorIngreso("Ingresa tu usuario y tu contraseña.");
      return;
    }

    const anterior =
      idDeUsuario(sessionStorage.getItem("access_token")) ??
      idDeUsuario(sessionStorage.getItem("refresh_token"));

    setEnviando(true);
    setErrorIngreso(null);
    try {
      await login(usuario, clave);
    } catch (err) {
      setErrorIngreso(
        err.status === 429
          ? "Hiciste muchos intentos seguidos. Espera un minuto y vuelve a intentarlo."
          : err.status
            ? "Usuario o contraseña incorrectos."
            : "No pudimos hablar con el servidor. Intenta de nuevo.",
      );
      setEnviando(false);
      return;
    }

    // Si entró otra persona (o no se sabe quién estaba), se recarga la app
    // desde el inicio para no mezclar el nombre y el rol de dos sesiones.
    const nuevo = idDeUsuario(sessionStorage.getItem("access_token"));
    if (anterior === null || nuevo !== anterior) {
      window.location.assign("/inicio");
      return;
    }

    setEnviando(false);
    event.target.reset();
    dialogoRef.current?.close();
    onReingreso?.();
    const previo = focoPrevioRef.current;
    if (previo?.isConnected) previo.focus();
  }

  return (
    <>
      <AvisoSesion visible={visible} onEntrar={() => abrir()} />

      <dialog
        ref={dialogoRef}
        className="sesion-dialogo"
        aria-labelledby="sesion-dialogo-titulo"
        onCancel={(e) => enviando && e.preventDefault()}
      >
        <form className="sesion-dialogo__contenido" onSubmit={handleSubmit} noValidate>
          <h2 id="sesion-dialogo-titulo" className="sesion-dialogo__titulo">Entrar de nuevo</h2>
          <p className="sesion-dialogo__texto">
            Tu sesión expiró. Vuelve a entrar para seguir: lo que escribiste no se pierde.
          </p>

          <Campo etiqueta="Usuario o correo electrónico" name="usuario" type="text" autoComplete="username" />
          <Campo etiqueta="Contraseña" name="clave" type="password" autoComplete="current-password" />

          {errorIngreso && (
            <p className="sesion-dialogo__error" role="alert">{errorIngreso}</p>
          )}

          <div className="sesion-dialogo__acciones">
            <Boton variante="secundario" onClick={() => dialogoRef.current?.close()} disabled={enviando}>
              Cancelar
            </Boton>
            <Boton type="submit" variante="oscuro" disabled={enviando}>
              {enviando ? "Entrando..." : "Entrar"}
            </Boton>
          </div>
        </form>
      </dialog>
    </>
  );
}
