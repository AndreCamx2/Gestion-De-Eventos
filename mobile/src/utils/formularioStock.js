import { decimalDelUsuario } from "./formato";

const MAX_NOMBRE = 120;
const CANTIDAD_MAXIMA = 1000000;

// Mismas reglas que validar_nombre_cosa del backend: "Silla Tiffany x10" sí, "8888" no.
const LETRAS = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ";
const PATRON_NOMBRE = new RegExp(`^[${LETRAS}0-9 .,&'()/#+-]+$`);
const SIN_LETRAS = new RegExp(`[^${LETRAS}]`, "g");

export function errorNombreElemento(nombre) {
  if (!nombre) return "Escribe el nombre del elemento.";
  if (nombre.length > MAX_NOMBRE) return `El nombre admite máximo ${MAX_NOMBRE} caracteres.`;
  if (!PATRON_NOMBRE.test(nombre)) return "Solo letras, números y los signos . , - & ' ( ) / # +";
  if (nombre.replace(SIN_LETRAS, "").length < 2) {
    return "Debe tener al menos 2 letras: no puede ser solo números o símbolos.";
  }
  return null;
}

// Valida el formulario de stock antes de llamar al API, con las mismas reglas
// del backend (SGDE-98): cantidad entera de 0 en adelante y valor de 0 en adelante.
// Devuelve { datos, errores }: si `errores` tiene algo, no se llama al API.
export function validarStock({ nombreElemento, cantidad, valor }, { conNombre = false } = {}) {
  const errores = {};
  const datos = {};

  if (conNombre) {
    const nombre = String(nombreElemento ?? "").trim().replace(/\s+/g, " ");
    const error = errorNombreElemento(nombre);
    if (error) errores.nombre_elemento = error;
    datos.nombreElemento = nombre;
  }

  const textoCantidad = String(cantidad ?? "").trim();
  if (!/^\d+$/.test(textoCantidad)) errores.cantidad = "Escribe una cantidad entera de 0 en adelante.";
  else if (Number(textoCantidad) > CANTIDAD_MAXIMA) errores.cantidad = "La cantidad no puede pasar de 1.000.000.";
  else datos.cantidad = Number(textoCantidad);

  const textoValor = decimalDelUsuario(valor);
  if (textoValor === null || !/^\d+(\.\d{1,2})?$/.test(textoValor)) {
    errores.valor = "Escribe un valor de 0 en adelante (máximo 2 decimales).";
  } else if (textoValor.split(".")[0].replace(/^0+(?=\d)/, "").length > 10) {
    errores.valor = "El valor admite máximo 10 dígitos antes de los decimales.";
  } else {
    datos.valor = textoValor;
  }

  return { datos, errores };
}
