import { erroresDesdeApi as erroresDesdeApiComun } from "../utils/erroresApi";

export const OPCIONES_IMPUESTO = [
  { value: "0", label: "0% (sin impuesto)" },
  { value: "8", label: "8% impoconsumo (alimentos y bebidas)" },
  { value: "19", label: "19% IVA" },
];

export const FORM_VACIO = {
  sitio: "",
  nombre: "",
  precio: "",
  impuesto_pct: "19",
};

export function formDesdeConcepto(c) {
  return {
    sitio: String(c.sitio),
    nombre: c.nombre ?? "",
    precio: c.precio != null ? String(Number(c.precio)) : "",
    impuesto_pct: c.impuesto_pct != null ? String(Number(c.impuesto_pct)) : "0",
  };
}

export function formatCOP(valor) {
  return Number(valor || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function precioConImpuesto(precio, impuestoPct) {
  const base = Number(precio || 0);
  return base + (base * Number(impuestoPct || 0)) / 100;
}

export function etiquetaImpuesto(impuestoPct) {
  return `${Number(impuestoPct || 0)}%`;
}

export function validarForm(form) {
  const errores = {};
  if (!form.sitio)
    errores.sitio = "Selecciona el sitio al que pertenece el concepto.";
  if (!form.nombre.trim()) errores.nombre = "El nombre es obligatorio.";
  if (form.precio === "") {
    errores.precio = "El precio es obligatorio.";
  } else if (Number.isNaN(Number(form.precio))) {
    errores.precio = "Ingresa un número válido.";
  } else if (Number(form.precio) < 0) {
    errores.precio = "El precio no puede ser negativo.";
  }
  return errores;
}

export function payloadCreacion(form) {
  return {
    sitio: Number(form.sitio),
    nombre: form.nombre.trim(),
    precio: form.precio,
    impuesto_pct: form.impuesto_pct,
  };
}

export function payloadEdicion(form) {
  return {
    nombre: form.nombre.trim(),
    precio: form.precio,
    impuesto_pct: form.impuesto_pct,
  };
}

const CAMPOS = ["sitio", "nombre", "precio", "impuesto_pct"];

const MSG_NOMBRE_DUPLICADO =
  "Ya existe un concepto con ese nombre en este sitio.";

export function erroresDesdeApi(body) {
  const { non_field_errors, ...resto } = body ?? {};
  const generales = [].concat(non_field_errors ?? []);
  const esDuplicado = (msg) => /únic|unique/i.test(String(msg));

  const duplicado = generales.some(esDuplicado);
  const otros = generales.filter((msg) => !esDuplicado(msg));

  const { campos, general } = erroresDesdeApiComun(
    otros.length ? { ...resto, non_field_errors: otros } : resto,
    CAMPOS,
  );
  if (duplicado) campos.nombre = MSG_NOMBRE_DUPLICADO;
  return { campos, general };
}

export default function ConceptoForm({
  idPrefix,
  form,
  errores,
  sitios,
  onChange,
  esEdicion,
}) {
  const id = (campo) => `${idPrefix}-${campo}`;
  const error = (campo) =>
    errores[campo] && <p className="field__error">{errores[campo]}</p>;

  const impuestoFueraDeLista = !OPCIONES_IMPUESTO.some(
    (o) => o.value === form.impuesto_pct,
  );

  const total = precioConImpuesto(form.precio, form.impuesto_pct);
  const precioValido =
    form.precio !== "" &&
    !Number.isNaN(Number(form.precio)) &&
    Number(form.precio) >= 0;

  return (
    <>
      <div className="form-field">
        <label htmlFor={id("sitio")}>Sitio</label>
        <select
          id={id("sitio")}
          name="sitio"
          value={form.sitio}
          onChange={onChange}
          disabled={esEdicion}
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

      <div className="form-field">
        <label htmlFor={id("nombre")}>Nombre</label>
        <input
          id={id("nombre")}
          name="nombre"
          type="text"
          placeholder="Ej. Mesero por hora"
          value={form.nombre}
          onChange={onChange}
        />
        {error("nombre")}
      </div>

      <div className="form-field">
        <label htmlFor={id("precio")}>Precio (COP, sin impuesto)</label>
        <input
          id={id("precio")}
          name="precio"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          placeholder="45000"
          value={form.precio}
          onChange={onChange}
        />
        {error("precio")}
      </div>

      <div className="form-field">
        <label htmlFor={id("impuesto_pct")}>Impuesto</label>
        <select
          id={id("impuesto_pct")}
          name="impuesto_pct"
          value={form.impuesto_pct}
          onChange={onChange}
        >
          {OPCIONES_IMPUESTO.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
          {impuestoFueraDeLista && (
            <option value={form.impuesto_pct}>
              {form.impuesto_pct}% (valor actual)
            </option>
          )}
        </select>
        {error("impuesto_pct")}
      </div>

      <p className="conceptos-total">
        Precio con impuesto:{" "}
        <strong>{precioValido ? formatCOP(total) : "—"}</strong>
      </p>
    </>
  );
}
