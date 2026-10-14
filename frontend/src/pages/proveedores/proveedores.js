// Funciones de la pantalla de Proveedores que no usan estado: iniciales, stock de
// cada proveedor, totales, fechas, validación, lo que se envía al API y cómo se
// leen sus errores. Las usan Proveedores.jsx y las piezas de esta carpeta.
import { erroresDesdeApi as erroresDesdeApiComun } from "../../utils/erroresApi";
import { mesCorto } from "../../utils/inicioCifras";

const formatoEntero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const formatoCentavos = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// "$ 85.000", o "$ 1.200.000,50" si tiene centavos. El valor admite decimales en
// el modelo: redondear (como pesos() de Cotizaciones) mostraría un precio falso.
export function pesos(valor) {
  const n = Number(valor);
  const centavos = Math.round(n * 100) % 100 !== 0;
  return `$ ${(centavos ? formatoCentavos : formatoEntero).format(n)}`;
}

// Palabras que no cuentan para las iniciales: "Mobiliario El Puerto" → "MP".
const CONECTORES = new Set(["el", "la", "los", "las", "de", "del", "y", "e"]);

export function iniciales(nombre) {
  const palabras = String(nombre ?? "")
    .split(/\s+/)
    .filter((p) => /^[\p{L}\d]/u.test(p) && !CONECTORES.has(p.toLowerCase()));
  return palabras.slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "?";
}

export function porNombre(a, b) {
  return a.nombre.localeCompare(b.nombre, "es");
}

// Elementos de un proveedor, por nombre.
export function stockDe(stock, idProveedor) {
  return stock
    .filter((e) => e.proveedor === idProveedor)
    .sort((a, b) => a.nombre_elemento.localeCompare(b.nombre_elemento, "es"));
}

// Cuántos elementos tiene cada proveedor: { [idProveedor]: n }.
export function conteoPorProveedor(stock) {
  const conteo = {};
  for (const e of stock) conteo[e.proveedor] = (conteo[e.proveedor] ?? 0) + 1;
  return conteo;
}

// El API manda `valor` como texto ("12000.00"): se pasa a número para multiplicar.
export function valorTotalElemento(e) {
  return Number(e.cantidad) * Number(e.valor);
}

export function valorTotal(elementos) {
  return elementos.reduce((suma, e) => suma + valorTotalElemento(e), 0);
}

// actualizado_en trae hora y zona ("2026-10-12T15:30:00-05:00"): new Date respeta
// la zona y getDate() lo pasa a la hora local, como bloqueo_hasta en Cotizaciones.
export function fechaActualizado(texto) {
  const f = new Date(texto);
  if (Number.isNaN(f.getTime())) return "—";
  return `${f.getDate()} ${mesCorto(f)} ${f.getFullYear()}`;
}

// ===== Nuevo proveedor =====

export const PROVEEDOR_VACIO = { nombre: "", identificacion: "", contacto: "" };
const CAMPOS_PROVEEDOR = ["nombre", "identificacion", "contacto"];

export function validarProveedor(form) {
  const errores = {};
  if (!form.nombre.trim()) errores.nombre = "Escribe el nombre del proveedor.";
  return errores;
}

export function payloadProveedor(form) {
  return {
    nombre: form.nombre.trim(),
    identificacion: form.identificacion.trim(),
    contacto: form.contacto.trim(),
  };
}

export function erroresProveedor(body) {
  return erroresDesdeApiComun(body, CAMPOS_PROVEEDOR);
}

// ===== Agregar elemento =====

export const ELEMENTO_VACIO = { nombre_elemento: "", cantidad: "", valor: "" };
const CAMPOS_ELEMENTO = ["nombre_elemento", "cantidad", "valor"];

export function validarElemento(form) {
  const errores = validarCantidadYValor(form);
  if (!form.nombre_elemento.trim()) errores.nombre_elemento = "Escribe el nombre del elemento.";
  return errores;
}

// Cantidad entera y valor, los dos 0 o más. La comparten agregar y editar.
function validarCantidadYValor(form) {
  const errores = {};
  if (form.cantidad === "") errores.cantidad = "Escribe la cantidad.";
  else if (!Number.isInteger(Number(form.cantidad)) || Number(form.cantidad) < 0)
    errores.cantidad = "La cantidad es un número entero, 0 o más.";

  if (form.valor === "") errores.valor = "Escribe el valor unitario.";
  else if (Number.isNaN(Number(form.valor)) || Number(form.valor) < 0)
    errores.valor = "El valor es un número, 0 o más.";
  return errores;
}

export function payloadElemento(form, idProveedor) {
  return {
    proveedor: idProveedor,
    nombre_elemento: form.nombre_elemento.trim(),
    cantidad: Number(form.cantidad),
    valor: form.valor,
  };
}

// El elemento repetido en el mismo proveedor (UniqueConstraint de dos campos)
// llega en non_field_errors (SGDE-ERROR-011): se muestra junto a "Elemento".
export function erroresElemento(body) {
  const { non_field_errors, ...resto } = body ?? {};
  const generales = [].concat(non_field_errors ?? []);
  const esDuplicado = (msg) => /únic|unique/i.test(String(msg));
  const otros = generales.filter((msg) => !esDuplicado(msg));

  const { campos, general } = erroresDesdeApiComun(
    otros.length ? { ...resto, non_field_errors: otros } : resto,
    CAMPOS_ELEMENTO,
  );
  if (generales.some(esDuplicado)) campos.nombre_elemento = "Este proveedor ya tiene un elemento con ese nombre.";
  return { campos, general };
}

// ===== Editar elemento (SGDE-98) =====
// Solo cantidad y valor: el proveedor y el nombre no cambian (el API da 400).

const CAMPOS_EDICION_STOCK = ["cantidad", "valor"];

// El API manda valor como "12000.00": en el campo se ve "12000".
export function formDesdeElemento(e) {
  return { cantidad: String(e.cantidad), valor: String(Number(e.valor)) };
}

export function validarEdicionStock(form) {
  return validarCantidadYValor(form);
}

// Lo que cambió, para el PATCH: {} si nada cambió.
export function cambiosStock(form, elemento) {
  const cambios = {};
  if (Number(form.cantidad) !== elemento.cantidad) cambios.cantidad = Number(form.cantidad);
  if (Number(form.valor) !== Number(elemento.valor)) cambios.valor = form.valor;
  return cambios;
}

export function erroresEdicionStock(body) {
  return erroresDesdeApiComun(body, CAMPOS_EDICION_STOCK);
}
