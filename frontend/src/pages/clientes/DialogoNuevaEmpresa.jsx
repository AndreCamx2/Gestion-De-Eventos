import { useRef } from "react";
import { AvisoSesionEnVentana } from "../../components/SesionVencida";
import { Boton, Campo, Dialogo, cerrarDialogoDe } from "../../components/ui";
import { useNuevaEmpresa } from "./useNuevaEmpresa";

export default function DialogoNuevaEmpresa({ onCreada, onCerrar, onSesionVencida, sesionVencida, onEntrarDeNuevo }) {
  const e = useNuevaEmpresa({ onCreada, onSesionVencida });
  const guardarRef = useRef(null);
  const errorCiudad = e.errores.ciudad;

  return (
    <Dialogo idTitulo="empresa-nueva-titulo" titulo="Nueva empresa" bloqueado={e.guardando} onCerrar={onCerrar}>
      <form className="dialogo__form" onSubmit={e.guardar} noValidate>
        <Campo
          id="empresa-razon-social"
          etiqueta="Razón social"
          name="razon_social"
          autoComplete="organization"
          placeholder="Ej. Inversiones Caribe S.A.S."
          value={e.form.razon_social}
          onChange={e.cambiar}
          error={e.errores.razon_social}
          data-foco-inicial
        />
        <Campo
          id="empresa-nit"
          etiqueta="NIT"
          name="identificacion"
          autoComplete="off"
          inputMode="numeric"
          placeholder="Ej. 900123456-7"
          value={e.form.identificacion}
          onChange={e.cambiar}
          error={e.errores.identificacion}
        />
        <Campo
          id="empresa-contacto"
          etiqueta="Persona de contacto (opcional)"
          name="contacto"
          autoComplete="name"
          value={e.form.contacto}
          onChange={e.cambiar}
          error={e.errores.contacto}
        />
        <Campo
          id="empresa-correo"
          etiqueta="Correo (opcional)"
          name="correo"
          type="email"
          autoComplete="email"
          value={e.form.correo}
          onChange={e.cambiar}
          error={e.errores.correo}
        />
        <div className={["campo", errorCiudad && "campo--error"].filter(Boolean).join(" ")}>
          <label className="campo__etiqueta" htmlFor="empresa-ciudad">Ciudad (opcional)</label>
          <select
            id="empresa-ciudad"
            name="ciudad"
            className="campo__input"
            value={e.form.ciudad}
            onChange={e.cambiar}
            disabled={e.sinCiudades}
            aria-invalid={errorCiudad ? true : undefined}
            aria-describedby={errorCiudad ? "empresa-ciudad-error" : undefined}
          >
            <option value="">{e.sinCiudades ? "No se pudieron cargar las ciudades" : "Sin ciudad"}</option>
            {e.ciudades.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.nombre}</option>
            ))}
          </select>
          {errorCiudad && <p id="empresa-ciudad-error" className="campo__error">{errorCiudad}</p>}
        </div>

        {sesionVencida && <AvisoSesionEnVentana onEntrar={() => onEntrarDeNuevo(guardarRef.current)} />}
        {e.error && <p className="dialogo__error" role="alert">{e.error}</p>}

        <div className="dialogo__acciones">
          <Boton variante="secundario" disabled={e.guardando} onClick={(ev) => cerrarDialogoDe(ev.currentTarget)}>
            Cancelar
          </Boton>
          <Boton ref={guardarRef} type="submit" variante="oscuro" disabled={e.guardando}>
            {e.guardando ? "Guardando…" : "Crear empresa"}
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}
