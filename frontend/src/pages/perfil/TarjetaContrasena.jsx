import { useState } from "react";
import { cambiarContrasena } from "../../api/perfil";
import { Boton, Campo, Tarjeta } from "../../components/ui";
import { validarCambioContrasena } from "./perfil";
import { useEnvio } from "./useEnvio";

const VACIO = { password_actual: "", password_nueva: "", confirmacion: "" };
const CAMPOS = ["password_actual", "password_nueva"];

export default function TarjetaContrasena({ datosPersonales, onSesionVencida }) {
  const [form, setForm] = useState(VACIO);
  const envio = useEnvio({ campos: CAMPOS, onSesionVencida });
  const sinCambios = !form.password_actual && !form.password_nueva && !form.confirmacion;

  function cambiar(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    envio.limpiarError(name);
  }

  function guardar(e) {
    e.preventDefault();
    if (sinCambios || envio.guardando) return;
    envio.enviar(
      validarCambioContrasena(form, datosPersonales),
      () => cambiarContrasena({ passwordActual: form.password_actual, passwordNueva: form.password_nueva }),
      () => setForm(VACIO),
    );
  }

  return (
    <Tarjeta as="section" className="perfil-tarjeta" aria-labelledby="perfil-contrasena-titulo">
      <h2 id="perfil-contrasena-titulo" className="perfil-tarjeta__titulo">Contraseña</h2>
      <p className="perfil-aviso">
        Mínimo 8 caracteres, con letras y números. Al cambiarla se cierran tus sesiones en otros equipos.
      </p>
      <form className="perfil-form" onSubmit={guardar} noValidate>
        {envio.error && <p className="perfil-form__error" role="alert">{envio.error}</p>}
        <Campo
          id="perfil-password-actual"
          etiqueta="Contraseña actual"
          name="password_actual"
          type="password"
          autoComplete="current-password"
          value={form.password_actual}
          onChange={cambiar}
          error={envio.errores.password_actual}
        />
        <Campo
          id="perfil-password-nueva"
          etiqueta="Contraseña nueva"
          name="password_nueva"
          type="password"
          autoComplete="new-password"
          value={form.password_nueva}
          onChange={cambiar}
          error={envio.errores.password_nueva}
        />
        <Campo
          id="perfil-password-confirmacion"
          etiqueta="Confirmar contraseña nueva"
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          value={form.confirmacion}
          onChange={cambiar}
          error={envio.errores.confirmacion}
        />
        <div className="perfil-form__acciones">
          <p className="perfil-form__exito" role="status">{envio.exito ? "Contraseña cambiada" : ""}</p>
          <Boton type="submit" variante="oscuro" disabled={sinCambios || envio.guardando}>
            {envio.guardando ? "Guardando…" : "Guardar"}
          </Boton>
        </div>
      </form>
    </Tarjeta>
  );
}
