import { Link, useSearchParams } from "react-router-dom";
import { Boton } from "../components/ui";
import CampoClave from "./recuperacion/CampoClave";
import PantallaAcceso from "./recuperacion/PantallaAcceso";
import useRestablecerClave from "./recuperacion/useRestablecerClave";

export default function RestablecerClave() {
  const [parametros] = useSearchParams();
  const { errores, errorGeneral, enlaceInvalido, enviando, listo, enviar } = useRestablecerClave(
    parametros.get("uid"),
    parametros.get("token"),
  );

  function handleSubmit(event) {
    event.preventDefault();
    const datos = new FormData(event.target);
    enviar(datos.get("password")?.toString() ?? "", datos.get("confirmacion")?.toString() ?? "");
  }

  if (listo) {
    return (
      <PantallaAcceso titulo="Contraseña actualizada">
        <p className="acceso-aviso acceso-aviso--exito" role="status">
          Tu contraseña quedó cambiada. Por seguridad, cerramos las sesiones que tenías abiertas.
        </p>
        <Boton as={Link} to="/login" variante="principal" className="acceso-enviar">
          Iniciar sesión
        </Boton>
      </PantallaAcceso>
    );
  }

  if (enlaceInvalido) {
    return (
      <PantallaAcceso titulo="El enlace no sirve">
        <p className="acceso-aviso acceso-aviso--error" role="alert">
          Este enlace no es válido, ya se usó o venció. Pide uno nuevo para cambiar tu contraseña.
        </p>
        <Boton as={Link} to="/recuperar-clave" variante="principal" className="acceso-enviar">
          Pedir un enlace nuevo
        </Boton>
        <p className="acceso-pie">
          <Link to="/login" className="acceso-enlace">Volver a iniciar sesión</Link>
        </p>
      </PantallaAcceso>
    );
  }

  return (
    <PantallaAcceso
      titulo="Crea tu nueva contraseña"
      subtitulo="Usa mínimo 8 caracteres y evita datos fáciles de adivinar, como tu nombre o tu correo."
      onSubmit={handleSubmit}
    >
      <CampoClave id="password" etiqueta="Nueva contraseña" error={errores.password} />
      <CampoClave id="confirmacion" etiqueta="Confirmar contraseña" error={errores.confirmacion} />

      {errorGeneral && (
        <p className="acceso-aviso acceso-aviso--error" role="alert">{errorGeneral}</p>
      )}

      <Boton type="submit" variante="principal" className="acceso-enviar" disabled={enviando}>
        {enviando ? <span className="btn__spinner acceso-spinner" aria-hidden="true" /> : null}
        {enviando ? "Guardando…" : "Guardar contraseña"}
      </Boton>
    </PantallaAcceso>
  );
}
