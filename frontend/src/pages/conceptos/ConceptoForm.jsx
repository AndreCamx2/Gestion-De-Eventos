import {
  OPCIONES_IMPUESTO,
  formatCOP,
  impuestoFueraDeLista,
  precioConImpuesto,
  precioValido,
} from "./conceptos";

// Campos de la ventana "Nuevo concepto": sitio, nombre, precio e impuesto.
// Las funciones sin estado (validar, payloads, errores del API) viven en conceptos.js.
export default function ConceptoForm({
  idPrefix,
  form,
  errores,
  sitios,
  onChange,
  esEdicion,
}) {
  const id = (campo) => `${idPrefix}-${campo}`;
  const idError = (campo) => `${id(campo)}-error`;
  const describir = (campo) => (errores[campo] ? { "aria-invalid": true, "aria-describedby": idError(campo) } : {});
  const error = (campo) =>
    errores[campo] && (
      <p id={idError(campo)} className="conceptos-campo__error">
        {errores[campo]}
      </p>
    );
  const clase = (campo) => ["conceptos-campo", errores[campo] && "conceptos-campo--error"].filter(Boolean).join(" ");

  const total = precioConImpuesto(form.precio, form.impuesto_pct);

  return (
    <>
      <div className={clase("sitio")}>
        <label className="conceptos-campo__etiqueta" htmlFor={id("sitio")}>Sitio</label>
        <select
          id={id("sitio")}
          name="sitio"
          className="conceptos-campo__control"
          value={form.sitio}
          onChange={onChange}
          disabled={esEdicion}
          data-foco-inicial
          {...describir("sitio")}
        >
          <option value="">Selecciona un sitio...</option>
          {sitios.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.nombre}
            </option>
          ))}
        </select>
        {esEdicion && (
          <p className="conceptos-ayuda">
            El sitio no se puede cambiar. Si se registró en el sitio equivocado,
            desactívalo y crea uno nuevo.
          </p>
        )}
        {error("sitio")}
      </div>

      <div className={clase("nombre")}>
        <label className="conceptos-campo__etiqueta" htmlFor={id("nombre")}>Nombre</label>
        <input
          id={id("nombre")}
          name="nombre"
          type="text"
          className="conceptos-campo__control"
          placeholder="Ej. Mesero por hora"
          value={form.nombre}
          onChange={onChange}
          {...describir("nombre")}
        />
        {error("nombre")}
      </div>

      <div className="conceptos-dialogo__par">
        <div className={clase("precio")}>
          <label className="conceptos-campo__etiqueta" htmlFor={id("precio")}>Precio sin impuesto (COP)</label>
          <input
            id={id("precio")}
            name="precio"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            className="conceptos-campo__control"
            placeholder="45000"
            value={form.precio}
            onChange={onChange}
            {...describir("precio")}
          />
          {error("precio")}
        </div>

        <div className={clase("impuesto_pct")}>
          <label className="conceptos-campo__etiqueta" htmlFor={id("impuesto_pct")}>Impuesto</label>
          <select
            id={id("impuesto_pct")}
            name="impuesto_pct"
            className="conceptos-campo__control"
            value={form.impuesto_pct}
            onChange={onChange}
            {...describir("impuesto_pct")}
          >
            {OPCIONES_IMPUESTO.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
            {impuestoFueraDeLista(form.impuesto_pct) && (
              <option value={form.impuesto_pct}>
                {form.impuesto_pct}% (valor actual)
              </option>
            )}
          </select>
          {error("impuesto_pct")}
        </div>
      </div>

      <p className="conceptos-total">
        Precio con impuesto
        <strong>{precioValido(form.precio) ? formatCOP(total) : "—"}</strong>
      </p>
    </>
  );
}
