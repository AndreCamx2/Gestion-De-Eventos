import { useState } from "react";
import { Boton, Campo } from "../../components/ui";
import { SelectorRol, SelectorSitios } from "./CamposUsuario";
import { fortaleza } from "./usuarios";

function MedidorClave({ nivel, texto }) {
  return (
    <>
      <div className={`usuarios-medidor usuarios-medidor--${nivel}`} aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className="usuarios-medidor__barra" data-lleno={n <= nivel || undefined} />
        ))}
      </div>
      <p id="usuario-nuevo-clave-ayuda" className="usuarios-ayuda" aria-live="polite">{texto}</p>
    </>
  );
}

export default function FormNuevoUsuario({ u }) {
  const [verClave, setVerClave] = useState(false);
  const { nuevo, erroresNuevo: errores } = u;
  const medidor = fortaleza(nuevo.password, nuevo);

  return (
    <form className="usuarios-nuevo" aria-labelledby="usuario-nuevo-titulo" onSubmit={u.crear} noValidate>
      <h2 id="usuario-nuevo-titulo" className="usuarios-nuevo__titulo">Nuevo usuario</h2>

      <SelectorRol
        idPrefix="usuario-nuevo"
        roles={u.roles}
        valor={nuevo.rol}
        onCambiar={(v) => u.cambiarNuevo("rol", v)}
        error={errores.rol}
      />
      <Campo
        id="usuario-nuevo-username"
        etiqueta="Usuario"
        autoComplete="off"
        placeholder="Ej. luces.bocagrande"
        value={nuevo.username}
        onChange={(e) => u.cambiarNuevo("username", e.target.value)}
        error={errores.username}
      />
      <Campo
        id="usuario-nuevo-email"
        etiqueta="Correo"
        type="email"
        autoComplete="off"
        value={nuevo.email}
        onChange={(e) => u.cambiarNuevo("email", e.target.value)}
        error={errores.email}
      />
      <SelectorSitios
        idPrefix="usuario-nuevo"
        sitios={u.sitios}
        elegidos={nuevo.sitios}
        onAlternar={u.alternarSitioNuevo}
        error={errores.sitios}
      />

      <div className={["campo", errores.password && "campo--error"].filter(Boolean).join(" ")}>
        <label className="campo__etiqueta" htmlFor="usuario-nuevo-clave">Contraseña temporal</label>
        <div className="usuarios-clave">
          <input
            id="usuario-nuevo-clave"
            className="campo__input usuarios-clave__input"
            type={verClave ? "text" : "password"}
            autoComplete="new-password"
            value={nuevo.password}
            onChange={(e) => u.cambiarNuevo("password", e.target.value)}
            aria-invalid={errores.password ? true : undefined}
            aria-describedby={["usuario-nuevo-clave-ayuda", errores.password && "usuario-nuevo-clave-error"].filter(Boolean).join(" ")}
          />
          <button type="button" className="usuarios-clave__ver" aria-pressed={verClave} onClick={() => setVerClave((v) => !v)}>
            {verClave ? "Ocultar" : "Ver"}
          </button>
        </div>
        <MedidorClave nivel={medidor.nivel} texto={medidor.texto} />
        {errores.password && <p id="usuario-nuevo-clave-error" className="campo__error">{errores.password}</p>}
      </div>

      {u.errorNuevo && <p className="usuarios-error" role="alert">{u.errorNuevo}</p>}

      <Boton type="submit" className="usuarios-nuevo__crear" disabled={u.creando}>
        {u.creando ? "Creando…" : "Crear usuario"}
      </Boton>
    </form>
  );
}
