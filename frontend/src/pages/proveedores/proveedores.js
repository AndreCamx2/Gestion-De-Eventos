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

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function filtrarStock(elementos, busqueda) {
  const texto = normalizar(busqueda);
  if (!texto) return elementos;
  return elementos.filter((e) => normalizar(e.nombre_elemento).includes(texto));
}

export function estaAgotado(elemento) {
  return Number(elemento.cantidad) === 0;
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

export const MAX_NOMBRE_ELEMENTO = 120;
const MAX_DIGITOS_ENTEROS_VALOR = 10;
const MAX_DECIMALES_VALOR = 2;

export function validarElemento(form) {
  const errores = validarCantidadYValor(form);
  const nombre = form.nombre_elemento.trim();
  if (!nombre) errores.nombre_elemento = "Escribe el nombre del elemento.";
  else if (nombre.length > MAX_NOMBRE_ELEMENTO)
    errores.nombre_elemento = `El nombre admite máximo ${MAX_NOMBRE_ELEMENTO} caracteres.`;
  return errores;
}

function validarCantidad(texto) {
  if (texto === "") return "Escribe la cantidad.";
  if (!/^\d+$/.test(texto)) return "La cantidad es un número entero, 0 o más, sin decimales.";
  return null;
}

function validarValor(texto) {
  if (texto === "") return "Escribe el valor unitario.";
  const partes = /^(\d+)(?:\.(\d+))?$/.exec(texto);
  if (!partes) return "El valor es un número, 0 o más.";
  const [, enteros, decimales = ""] = partes;
  if (decimales.length > MAX_DECIMALES_VALOR) return `El valor admite máximo ${MAX_DECIMALES_VALOR} decimales.`;
  if (enteros.replace(/^0+(?=\d)/, "").length > MAX_DIGITOS_ENTEROS_VALOR)
    return `El valor admite máximo ${MAX_DIGITOS_ENTEROS_VALOR} dígitos antes de los decimales.`;
  return null;
}

function validarCantidadYValor(form) {
  const errores = {};
  const cantidad = validarCantidad(String(form.cantidad).trim());
  const valor = validarValor(String(form.valor).trim());
  if (cantidad) errores.cantidad = cantidad;
  if (valor) errores.valor = valor;
  return errores;
}

export function quedaAgotado(form) {
  return /^0+$/.test(String(form.cantidad).trim());
}

export function payloadElemento(form, idProveedor) {
  return {
    proveedor: idProveedor,
    nombre_elemento: form.nombre_elemento.trim(),
    cantidad: Number(form.cantidad),
    valor: String(form.valor).trim(),
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

// ===== Usuario de acceso (SGDE-30 y 72) =====

// Usuarios con rol proveedor que se pueden vincular a `proveedor`: los que no
// tienen otro proveedor, más el suyo actual. Por username.
export function usuariosLibres(usuarios, proveedores, proveedor) {
  const tomados = new Set(
    proveedores.filter((p) => p.id !== proveedor.id && p.usuario != null).map((p) => p.usuario),
  );
  return usuarios
    .filter((u) => !tomados.has(u.id))
    .sort((a, b) => a.username.localeCompare(b.username, "es"));
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
  if (Number(form.valor) !== Number(elemento.valor)) cambios.valor = String(form.valor).trim();
  return cambios;
}

export function erroresEdicionStock(body) {
  return erroresDesdeApiComun(body, CAMPOS_EDICION_STOCK);
}
