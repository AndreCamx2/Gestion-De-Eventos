import { decimalDelUsuario } from "./formato";

const MAX_NOMBRE = 120;
const CANTIDAD_MAXIMA = 1000000;

export function validarStock({ nombreElemento, cantidad, valor }, { conNombre = false } = {}) {
  const errores = {};
  const datos = {};

  if (conNombre) {
    const nombre = String(nombreElemento ?? "").trim();
    if (!nombre) errores.nombre_elemento = "Escribe el nombre del elemento.";
    else if (nombre.length > MAX_NOMBRE) errores.nombre_elemento = `El nombre admite máximo ${MAX_NOMBRE} caracteres.`;
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
