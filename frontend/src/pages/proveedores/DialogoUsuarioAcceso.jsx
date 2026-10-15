import { useEffect, useRef, useState } from "react";
import { vincularUsuarioProveedor } from "../../api/proveedores";
import { listarUsuarios } from "../../api/usuarios";
import { AvisoSesionEnVentana } from "../../components/SesionVencida";
import { Boton, Dialogo, cerrarDialogoDe } from "../../components/ui";
import { textoError } from "../../utils/erroresApi";
import { usuariosLibres } from "./proveedores";

// Ventana "Usuario de acceso" (SGDE-30 y 72): vincula a un proveedor el usuario
// con rol proveedor que entra a "Mi stock", o lo desvincula ("Sin usuario").
// La lista trae los usuarios proveedor que no están vinculados a otro proveedor.
// - proveedor: el elegido. proveedores: todos, para saber qué usuarios ya están tomados.
// - onGuardado(proveedor): el API respondió; Proveedores.jsx actualiza la tarjeta y la cierra.
// - onSesionVencida(), sesionVencida, onEntrarDeNuevo(boton): aviso dentro de la ventana (SGDE-94).
export default function DialogoUsuarioAcceso({
  proveedor, proveedores, onGuardado, onCerrar, onSesionVencida, sesionVencida, onEntrarDeNuevo,
}) {
  // Usuarios con rol proveedor tal como llegan del API; null mientras cargan.
  const [todos, setTodos] = useState(null);
  const [elegido, setElegido] = useState(proveedor.usuario == null ? "" : String(proveedor.usuario));
  const [errorCampo, setErrorCampo] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const guardarRef = useRef(null);
  const usuarios = todos && usuariosLibres(todos, proveedores, proveedor);

  // Se cargan al abrir y, si la sesión venció, otra vez al volver a entrar.
  useEffect(() => {
    if (sesionVencida || todos !== null) return undefined;
    let vigente = true;
    listarUsuarios({ rol: "proveedor" })
      .then((lista) => vigente && setTodos(lista))
      .catch((err) => {
        if (!vigente) return;
        if (err.status === 401) onSesionVencida();
        else setError("No pudimos cargar los usuarios proveedor. Cierra y vuelve a intentarlo.");
      });
    return () => {
      vigente = false;
    };
  }, [sesionVencida, todos, onSesionVencida]);

  async function guardar(e) {
    e.preventDefault();
    setError(null);
    setErrorCampo(null);
    const usuario = elegido === "" ? null : Number(elegido);
    if (usuario === (proveedor.usuario ?? null)) {
      cerrarDialogoDe(e.currentTarget);
      return;
    }
    setGuardando(true);
    try {
      const actualizado = await vincularUsuarioProveedor(proveedor.id, usuario);
      setGuardando(false);
      onGuardado(actualizado);
    } catch (err) {
      setGuardando(false);
      if (err.status === 400 && err.body?.usuario) setErrorCampo(textoError(err.body.usuario));
      else if (err.status === 400) setError(textoError(err.body?.detail ?? "El servidor no aceptó el cambio."));
      else if (err.status === 401) onSesionVencida();
      else if (err.status === 403) setError("Solo un administrador puede vincular usuarios.");
      else if (err.status === 404) setError("Este proveedor ya no existe. Cierra y vuelve a cargar la pantalla.");
      else setError("No pudimos hablar con el servidor. Inténtalo de nuevo.");
    }
  }

  return (
    <Dialogo idTitulo="proveedores-acceso-titulo" titulo="Usuario de acceso" bloqueado={guardando} onCerrar={onCerrar}>
      <form className="dialogo__form" onSubmit={guardar} noValidate>
        <p className="proveedores-dialogo__para">
          Quien entre con este usuario verá y actualizará el stock de <strong>{proveedor.nombre}</strong> en "Mi stock".
        </p>
        <div className={["campo", errorCampo && "campo--error"].filter(Boolean).join(" ")}>
          <label className="campo__etiqueta" htmlFor="proveedor-acceso-usuario">Usuario</label>
          <select
            id="proveedor-acceso-usuario"
            className="campo__input"
            value={elegido}
            disabled={usuarios === null}
            onChange={(ev) => {
              setElegido(ev.target.value);
              setErrorCampo(null);
            }}
            aria-invalid={errorCampo ? true : undefined}
            aria-describedby={errorCampo ? "proveedor-acceso-error" : "proveedor-acceso-ayuda"}
          >
            <option value="">Sin usuario</option>
            {(usuarios ?? []).map((u) => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
          {errorCampo ? (
            <p id="proveedor-acceso-error" className="campo__error">{errorCampo}</p>
          ) : (
            <p id="proveedor-acceso-ayuda" className="proveedores-dialogo__ayuda">
              {usuarios === null
                ? "Cargando usuarios…"
                : usuarios.length === 0
                  ? "No hay usuarios proveedor libres. Créalo primero en Usuarios."
                  : "Solo aparecen los usuarios con rol proveedor que no tienen otro proveedor."}
            </p>
          )}
        </div>
        {sesionVencida && <AvisoSesionEnVentana onEntrar={() => onEntrarDeNuevo(guardarRef.current)} />}
        {error && <p className="dialogo__error" role="alert">{error}</p>}
        <div className="dialogo__acciones">
          <Boton variante="secundario" disabled={guardando} onClick={(ev) => cerrarDialogoDe(ev.currentTarget)}>
            Cancelar
          </Boton>
          <Boton ref={guardarRef} type="submit" variante="oscuro" disabled={guardando || usuarios === null}>
            {guardando ? "Guardando…" : "Guardar"}
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}
