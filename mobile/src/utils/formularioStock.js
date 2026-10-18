import { decimalDelUsuario } from "./formato";

// Valida el formulario de stock antes de llamar al API, con las mismas reglas
// del backend (SGDE-98): cantidad entera de 0 en adelante y valor de 0 en adelante.
// Devuelve { datos, errores }: si `errores` tiene algo, no se llama al API.
export function validarStock({ nombreElemento, cantidad, valor }, { conNombre = false } = {}) {
  const errores = {};
  const datos = {};

  if (conNombre) {
    const nombre = String(nombreElemento ?? "").trim();
    if (!nombre) errores.nombre_elemento = "Escribe el nombre del elemento.";
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
