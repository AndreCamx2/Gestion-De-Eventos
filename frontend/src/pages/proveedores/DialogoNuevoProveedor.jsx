import { useRef, useState } from "react";
import { crearProveedor } from "../../api/proveedores";
import { AvisoSesionEnVentana } from "../../components/SesionVencida";
import { Boton, Campo, Dialogo, cerrarDialogoDe } from "../../components/ui";
import { PROVEEDOR_VACIO, erroresProveedor, payloadProveedor, validarProveedor } from "./proveedores";

// Ventana "Nuevo proveedor": nombre (obligatorio), identificación y contacto.
// - onCreado(proveedor): se creó; Proveedores.jsx la cierra, agrega la tarjeta y la elige.
// - onSesionVencida(): 401 aunque apiFetch intentó renovar el token.
// - sesionVencida / onEntrarDeNuevo(boton): con la sesión vencida, el aviso va
//   dentro de la ventana, que no se cierra ni pierde lo escrito (SGDE-94). Al volver
//   a entrar, el foco regresa a "Guardar".
export default function DialogoNuevoProveedor({ onCreado, onCerrar, onSesionVencida, sesionVencida, onEntrarDeNuevo }) {
  const [form, setForm] = useState(PROVEEDOR_VACIO);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const guardarRef = useRef(null);

  function cambiar(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrores((prev) => ({ ...prev, [name]: undefined }));
  }

  async function guardar(e) {
    e.preventDefault();
    setError(null);
    const locales = validarProveedor(form);
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setGuardando(true);
    try {
      const creado = await crearProveedor(payloadProveedor(form));
      setGuardando(false);
      onCreado(creado);
    } catch (err) {
      setGuardando(false);
      if (err.status === 400) {
        const { campos, general } = erroresProveedor(err.body);
        setErrores(campos);
        setError(general);
      } else if (err.status === 401) {
        onSesionVencida();
      } else if (err.status === 403) {
        setError("No tienes permiso para crear proveedores.");
      } else {
        setError("No pudimos hablar con el servidor. Inténtalo de nuevo.");
      }
    }
  }

  return (
    <Dialogo idTitulo="proveedores-nuevo-titulo" titulo="Nuevo proveedor" bloqueado={guardando} onCerrar={onCerrar}>
      <form className="dialogo__form" onSubmit={guardar} noValidate>
        <Campo
          id="proveedor-nombre"
          etiqueta="Nombre"
          name="nombre"
          autoComplete="off"
          placeholder="Ej. Sonido Caribe Ltda."
          value={form.nombre}
          onChange={cambiar}
          error={errores.nombre}
        />
        <Campo
          id="proveedor-identificacion"
          etiqueta="Identificación (opcional)"
          name="identificacion"
          autoComplete="off"
          placeholder="NIT o cédula"
          value={form.identificacion}
          onChange={cambiar}
          error={errores.identificacion}
        />
        <Campo
          id="proveedor-contacto"
          etiqueta="Contacto (opcional)"
          name="contacto"
          autoComplete="off"
          placeholder="Persona o teléfono"
          value={form.contacto}
          onChange={cambiar}
          error={errores.contacto}
        />
        {sesionVencida && <AvisoSesionEnVentana onEntrar={() => onEntrarDeNuevo(guardarRef.current)} />}
        {error && <p className="dialogo__error" role="alert">{error}</p>}
        <div className="dialogo__acciones">
          <Boton variante="secundario" disabled={guardando} onClick={(e) => cerrarDialogoDe(e.currentTarget)}>
            Cancelar
          </Boton>
          <Boton ref={guardarRef} type="submit" variante="oscuro" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar"}
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}
