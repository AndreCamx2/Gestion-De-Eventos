import { useState } from "react";
import { actualizarConcepto } from "../../api/conceptos";
import { Boton } from "../../components/ui";
import HistorialPrecios from "./HistorialPrecios";
import {
  OPCIONES_IMPUESTO,
  erroresDesdeApi,
  formDesdeConcepto,
  formatCOP,
  impuestoFueraDeLista,
  payloadEdicion,
  precioConImpuesto,
  precioValido,
  validarForm,
} from "./conceptos";

// Panel lateral del concepto elegido: precio, nombre, impuesto, el botón de
// activar o desactivar y el historial de precios.
//
// Conceptos.jsx lo monta con key={concepto.id}: el formulario se reinicia al
// elegir OTRO concepto, no cuando la lista se recarga (trae objetos nuevos de los
// mismos conceptos). Así, si la sesión vence al guardar, lo escrito sigue aquí.
// - onGuardado(): se guardó; Conceptos.jsx recarga la lista (devuelve una promesa).
// - onCambiarEstado(): abre la ventana de activar o desactivar.
// - sesionVencida / onSesionVencida(): 401 al guardar o al pedir el historial. El
//   panel no es modal: basta la barra de abajo de SesionVencida.
export default function PanelConcepto({
  ref,
  concepto,
  nombreSitio,
  onGuardado,
  onCambiarEstado,
  sesionVencida,
  onSesionVencida,
}) {
  const [form, setForm] = useState(() => formDesdeConcepto(concepto));
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [versionHistorial, setVersionHistorial] = useState(0);

  function cambiar(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrores((prev) => ({ ...prev, [name]: undefined }));
    setAviso("");
  }

  async function guardar(e) {
    e.preventDefault();
    setError(null);
    setAviso("");

    const erroresLocales = validarForm(form);
    setErrores(erroresLocales);
    if (Object.keys(erroresLocales).length > 0) return;

    setGuardando(true);
    try {
      const actualizado = await actualizarConcepto(concepto.id, payloadEdicion(form));
      // Lo que quedó guardado (por ejemplo, el nombre sin espacios de más).
      if (actualizado?.id) setForm(formDesdeConcepto(actualizado));
      await onGuardado();
      setVersionHistorial((v) => v + 1);
      setAviso("Cambios guardados.");
    } catch (err) {
      if (err.status === 400 && err.body && typeof err.body === "object") {
        const { campos, general } = erroresDesdeApi(err.body);
        setErrores(campos);
        setError(general);
      } else if (err.status === 401) {
        // El formulario se queda como está: al volver a entrar, se guarda de nuevo.
        onSesionVencida();
      } else if (err.status === 403) {
        setError("No tienes permisos suficientes para editar conceptos.");
      } else if (err.status === 404) {
        setError("Este concepto ya no existe. Actualiza la lista.");
      } else {
        setError("Error inesperado en el servidor al guardar los cambios.");
      }
    } finally {
      setGuardando(false);
    }
  }

  const cambiaPrecio = precioValido(form.precio) && Number(form.precio) !== Number(concepto.precio);

  const errorCampo = (campo) =>
    errores[campo] && (
      <p id={`panel-${campo}-error`} className="conceptos-campo__error">
        {errores[campo]}
      </p>
    );
  const describir = (campo) =>
    errores[campo] ? { "aria-invalid": true, "aria-describedby": `panel-${campo}-error` } : {};
  const clase = (campo) => ["conceptos-campo", errores[campo] && "conceptos-campo--error"].filter(Boolean).join(" ");

  return (
    <aside ref={ref} className="conceptos-panel" aria-label="Concepto seleccionado">
      <div>
        <p className="conceptos-panel__sitio">{nombreSitio(concepto.sitio)}</p>
        <h2 className="conceptos-panel__titulo">
          {concepto.nombre}
          {!concepto.activo && <span className="conceptos-inactivo">Inactivo</span>}
        </h2>
      </div>

      <form className="conceptos-panel__form" onSubmit={guardar} noValidate>
        <div className="conceptos-panel__precios">
          <div className={clase("precio")}>
            <label className="conceptos-campo__etiqueta" htmlFor="panel-precio">
              Precio sin impuesto
            </label>
            <div className="conceptos-precio">
              <span className="conceptos-precio__signo" aria-hidden="true">$</span>
              <input
                id="panel-precio"
                name="precio"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                className="conceptos-precio__input"
                value={form.precio}
                onChange={cambiar}
                {...describir("precio")}
              />
            </div>
            {errorCampo("precio")}
          </div>
          <div className="conceptos-panel__final">
            <span className="conceptos-campo__etiqueta">Con impuesto</span>
            <span className="conceptos-panel__final-valor">
              {precioValido(form.precio) ? formatCOP(precioConImpuesto(form.precio, form.impuesto_pct)) : "—"}
            </span>
          </div>
        </div>

        <div className="conceptos-panel__par">
          <div className={clase("nombre")}>
            <label className="conceptos-campo__etiqueta" htmlFor="panel-nombre">Nombre</label>
            <input
              id="panel-nombre"
              name="nombre"
              type="text"
              className="conceptos-campo__control"
              value={form.nombre}
              onChange={cambiar}
              {...describir("nombre")}
            />
            {errorCampo("nombre")}
          </div>
          <div className={clase("impuesto_pct")}>
            <label className="conceptos-campo__etiqueta" htmlFor="panel-impuesto_pct">Impuesto</label>
            <select
              id="panel-impuesto_pct"
              name="impuesto_pct"
              className="conceptos-campo__control"
              value={form.impuesto_pct}
              onChange={cambiar}
              {...describir("impuesto_pct")}
            >
              {OPCIONES_IMPUESTO.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
              {impuestoFueraDeLista(form.impuesto_pct) && (
                <option value={form.impuesto_pct}>{form.impuesto_pct}% (valor actual)</option>
              )}
            </select>
            {errorCampo("impuesto_pct")}
          </div>
        </div>

        <p className="conceptos-aviso">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 8v5M12 16h.01" />
            <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
          </svg>
          <span>
            {cambiaPrecio
              ? `El precio cambia de ${formatCOP(concepto.precio)} a ${formatCOP(form.precio)}. Quedará en el historial; las cotizaciones ya enviadas no cambian.`
              : "Si cambias el precio, quedará en el historial. Las cotizaciones ya enviadas no cambian."}
          </span>
        </p>

        {error && <p className="conceptos-error" role="alert">{error}</p>}

        <Boton type="submit" variante="oscuro" disabled={guardando} className="conceptos-panel__guardar">
          {guardando ? "Guardando…" : "Guardar cambios"}
        </Boton>
        <p className="conceptos-panel__estado" role="status">{aviso}</p>
      </form>

      <Boton
        variante={concepto.activo ? "peligro" : "secundario"}
        className="conceptos-panel__estado-boton"
        onClick={onCambiarEstado}
      >
        {concepto.activo ? "Desactivar concepto" : "Reactivar concepto"}
      </Boton>

      <HistorialPrecios
        conceptoId={concepto.id}
        version={versionHistorial}
        sesionVencida={sesionVencida}
        onSesionVencida={onSesionVencida}
      />
    </aside>
  );
}
