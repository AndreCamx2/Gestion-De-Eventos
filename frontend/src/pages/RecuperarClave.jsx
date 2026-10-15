import { Link } from "react-router-dom";
import { Boton, Campo } from "../components/ui";
import PantallaAcceso from "./recuperacion/PantallaAcceso";
import useRecuperarClave from "./recuperacion/useRecuperarClave";

export default function RecuperarClave() {
  const { error, errorGeneral, enviando, enviado, enviar } = useRecuperarClave();

  function handleSubmit(event) {
    event.preventDefault();
    const email = new FormData(event.target).get("email")?.toString().trim();
    enviar(email);
  }

  if (enviado) {
    return (
      <PantallaAcceso titulo="Revisa tu correo">
        <p className="acceso-aviso acceso-aviso--exito" role="status">
          Si ese correo está registrado, te llegará un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.
        </p>
        <p className="acceso-pie">
          <Link to="/login" className="acceso-enlace">Volver a iniciar sesión</Link>
        </p>
      </PantallaAcceso>
    );
  }

  return (
    <PantallaAcceso
      titulo="¿Olvidaste tu contraseña?"
      subtitulo="Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva."
      onSubmit={handleSubmit}
    >
      <Campo
        etiqueta={<>Correo electrónico <span className="acceso-obligatorio" aria-hidden="true">*</span></>}
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="nombre@empresa.com"
        required
        error={error}
      />

      {errorGeneral && (
        <p className="acceso-aviso acceso-aviso--error" role="alert">{errorGeneral}</p>
      )}

      <Boton type="submit" variante="principal" className="acceso-enviar" disabled={enviando}>
        {enviando ? <span className="btn__spinner acceso-spinner" aria-hidden="true" /> : null}
        {enviando ? "Enviando…" : "Enviar enlace"}
      </Boton>

      <div className="acceso-divisor" />

      <p className="acceso-pie">
        ¿Ya la recordaste? <Link to="/login" className="acceso-enlace">Inicia sesión</Link>
      </p>
    </PantallaAcceso>
  );
}
