import { useState } from "react";
import { cambiarCorreo } from "../../api/perfil";
import { Boton, Campo, Tarjeta } from "../../components/ui";
import { validarCambioCorreo } from "./perfil";
import { useEnvio } from "./useEnvio";

const VACIO = { correo_nuevo: "", password_actual: "" };
const CAMPOS = ["correo_nuevo", "password_actual"];

function AvisoAcceso({ acceso }) {
  if (acceso.inicia_con_correo) return <p className="perfil-aviso">Con este correo vas a iniciar sesión.</p>;
  return (
    <p className="perfil-aviso">
      Inicias sesión con tu usuario <strong>{acceso.usuario}</strong>. Este correo sirve para recuperar tu contraseña.
    </p>
  );
}

export default function TarjetaCorreo({ acceso, onCambiado, onSesionVencida }) {
  const [form, setForm] = useState(VACIO);
  const envio = useEnvio({ campos: CAMPOS, onSesionVencida });
  const sinCambios = !form.correo_nuevo.trim();

  function cambiar(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    envio.limpiarError(name);
  }

  function guardar(e) {
    e.preventDefault();
    if (sinCambios || envio.guardando) return;
    envio.enviar(
      validarCambioCorreo(form, acceso.correo),
      () => cambiarCorreo({ correoNuevo: form.correo_nuevo.trim(), passwordActual: form.password_actual }),
      (respuesta) => {
        setForm(VACIO);
        onCambiado({ usuario: respuesta.usuario, correo: respuesta.correo, inicia_con_correo: respuesta.inicia_con_correo });
      },
    );
  }

  return (
    <Tarjeta as="section" className="perfil-tarjeta" aria-labelledby="perfil-correo-titulo">
      <h2 id="perfil-correo-titulo" className="perfil-tarjeta__titulo">Correo de acceso</h2>
      <dl className="perfil-datos">
        <div className="perfil-dato">
          <dt>Correo actual</dt>
          <dd>{acceso.correo || "Sin correo"}</dd>
        </div>
      </dl>
      <form className="perfil-form" onSubmit={guardar} noValidate>
        {envio.error && <p className="perfil-form__error" role="alert">{envio.error}</p>}
        <Campo
          id="perfil-correo-nuevo"
          etiqueta="Correo nuevo"
          name="correo_nuevo"
          type="email"
          autoComplete="email"
          placeholder="nombre@correo.com"
          value={form.correo_nuevo}
          onChange={cambiar}
          error={envio.errores.correo_nuevo}
        />
        <AvisoAcceso acceso={acceso} />
        <Campo
          id="perfil-correo-password"
          etiqueta="Contraseña actual"
          name="password_actual"
          type="password"
          autoComplete="current-password"
          value={form.password_actual}
          onChange={cambiar}
          error={envio.errores.password_actual}
        />
        <div className="perfil-form__acciones">
          <p className="perfil-form__exito" role="status">{envio.exito ? "Correo actualizado" : ""}</p>
          <Boton type="submit" variante="oscuro" disabled={sinCambios || envio.guardando}>
            {envio.guardando ? "Guardando…" : "Guardar"}
          </Boton>
        </div>
      </form>
    </Tarjeta>
  );
}
