// Funciones de la pantalla de Conceptos que no usan estado: formatos, validación,
// lo que se envía al API y cómo se leen sus errores. Las usan Conceptos.jsx y las
// piezas de esta carpeta.
import { erroresDesdeApi as erroresDesdeApiComun } from "../../utils/erroresApi";

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

// Precio escrito que se puede mostrar con impuesto: número y no negativo.
export function precioValido(precio) {
  return precio !== "" && !Number.isNaN(Number(precio)) && Number(precio) >= 0;
}

export function etiquetaImpuesto(impuestoPct) {
  return `${Number(impuestoPct || 0)}%`;
}

export function claseImpuesto(impuestoPct) {
  const valor = Number(impuestoPct || 0);
  return [0, 8, 19].includes(valor) ? `conceptos-impuesto--${valor}` : "conceptos-impuesto--otro";
}

export function impuestoFueraDeLista(impuestoPct) {
  return !OPCIONES_IMPUESTO.some((o) => o.value === impuestoPct);
}

export function validarForm(form) {
  const errores = {};
  if (!form.sitio)
    errores.sitio = "Selecciona el venue al que pertenece el concepto.";
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
  "Ya existe un concepto con ese nombre en este venue.";

// Envuelve el clasificador común de utils/erroresApi.js: el error de "único"
// (nombre repetido en el mismo sitio) se muestra junto al campo nombre.
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

// Historial de precios.
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const formatoPorcentaje = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

export function fechaHistorial(texto) {
  const f = new Date(texto);
  if (Number.isNaN(f.getTime())) return "";
  return `${f.getDate()} ${MESES[f.getMonth()]} ${f.getFullYear()}`;
}

export function variacion(anterior, nuevo) {
  const a = Number(anterior);
  const n = Number(nuevo);
  if (!a) return null;
  const pct = ((n - a) / a) * 100;
  return { texto: `${pct > 0 ? "+" : ""}${formatoPorcentaje.format(pct)}%`, sube: pct > 0 };
}
