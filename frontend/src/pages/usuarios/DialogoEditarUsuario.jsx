import { useRef, useState } from "react";
import { actualizarUsuario } from "../../api/usuarios";
import { AvisoSesionEnVentana } from "../../components/SesionVencida";
import { Boton, Campo, Dialogo, cerrarDialogoDe } from "../../components/ui";
import { SelectorRol, SelectorSitios } from "./CamposUsuario";
import { erroresUsuario, formEdicion, mensajeError, nombreCompleto, payloadEdicion, validarEdicion } from "./usuarios";

export default function DialogoEditarUsuario({ usuario, roles, sitios, esYo, onGuardado, onCerrar, sesion }) {
  const [form, setForm] = useState(() => formEdicion(usuario));
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const guardarRef = useRef(null);

  function cambiar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
  }

  function alternarSitio(id) {
    const valor = String(id);
    cambiar("sitios", form.sitios.includes(valor) ? form.sitios.filter((s) => s !== valor) : [...form.sitios, valor]);
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) return;
    setError(null);
    const locales = validarEdicion(form);
    setErrores(locales);
    if (Object.keys(locales).length) return;
    setGuardando(true);
    try {
      const actualizado = await actualizarUsuario(usuario.id, payloadEdicion(form, usuario, { esYo }));
      setGuardando(false);
      onGuardado(actualizado, `Cambios guardados para "${actualizado.username}".`);
    } catch (err) {
      setGuardando(false);
      if (err.status === 400) {
        const { campos, general } = erroresUsuario(err.body);
        setErrores(campos);
        setError(general);
      } else if (err.status === 401) {
        sesion.onSesionVencida();
      } else {
        setError(mensajeError(err.status, "editar usuarios"));
      }
    }
  }

  return (
    <Dialogo idTitulo="usuario-editar-titulo" titulo={`Editar a ${nombreCompleto(usuario)}`} bloqueado={guardando} onCerrar={onCerrar}>
      <form className="dialogo__form" onSubmit={guardar} noValidate>
        <p className="usuarios-ayuda">Usuario: <strong>{usuario.username}</strong> (no se puede cambiar).</p>
        <div className="usuarios-par">
          <Campo id="usuario-editar-nombre" etiqueta="Nombre" value={form.first_name} onChange={(e) => cambiar("first_name", e.target.value)} error={errores.first_name} data-foco-inicial />
          <Campo id="usuario-editar-apellido" etiqueta="Apellido" value={form.last_name} onChange={(e) => cambiar("last_name", e.target.value)} error={errores.last_name} />
        </div>
        <Campo id="usuario-editar-email" etiqueta="Correo" type="email" value={form.email} onChange={(e) => cambiar("email", e.target.value)} error={errores.email} />
        <SelectorRol
          idPrefix="usuario-editar"
          roles={roles}
          valor={form.rol}
          onCambiar={(v) => cambiar("rol", v)}
          error={errores.rol}
          bloqueado={esYo}
          ayuda={esYo ? "No puedes cambiar tu propio rol. Pídeselo a otro administrador." : null}
        />
        <SelectorSitios idPrefix="usuario-editar" sitios={sitios} elegidos={form.sitios} onAlternar={alternarSitio} error={errores.sitios} />

        {sesion.sesionVencida && <AvisoSesionEnVentana onEntrar={() => sesion.onEntrarDeNuevo(guardarRef.current)} />}
        {error && <p className="dialogo__error" role="alert">{error}</p>}

        <div className="dialogo__acciones">
          <Boton variante="secundario" disabled={guardando} onClick={(e) => cerrarDialogoDe(e.currentTarget)}>Cancelar</Boton>
          <Boton ref={guardarRef} type="submit" variante="oscuro" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}
