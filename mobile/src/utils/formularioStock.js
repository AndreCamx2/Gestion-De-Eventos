import { decimalDelUsuario } from "./formato";

// Mismas reglas que validar_nombre_cosa del backend: "Silla Tiffany x10" sí, "8888" no.
const LETRAS = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ";
const PATRON_NOMBRE = new RegExp(`^[${LETRAS}0-9 .,&'()/#+-]+$`);
const SIN_LETRAS = new RegExp(`[^${LETRAS}]`, "g");

export function errorNombreElemento(nombre) {
  if (!nombre) return "Escribe el nombre del elemento.";
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
  else datos.cantidad = Number(textoCantidad);

  const textoValor = decimalDelUsuario(valor);
  if (textoValor === null || !/^\d+(\.\d{1,2})?$/.test(textoValor)) {
    errores.valor = "Escribe un valor de 0 en adelante (máximo 2 decimales).";
  } else {
    datos.valor = textoValor;
  }

  return { datos, errores };
}
