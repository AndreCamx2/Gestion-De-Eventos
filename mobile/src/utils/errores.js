import { ErrorApi, ErrorRed } from "../api/cliente";

const NOMBRES = {
  bloqueo_hasta: "Bloqueo",
  nombre_elemento: "Nombre",
  cantidad: "Cantidad",
  valor: "Valor",
};

// Convierte un error del API en { general, campos } para mostrarlo en pantalla.
// - campos: {campo: "mensaje"} para los 400 con errores por campo.
// - general: un texto para todo lo demás.
export function mensajeDeError(error) {
  if (error instanceof ErrorRed) {
    return {
      general: "No pudimos conectarnos. Revisa tu internet; si el servidor estaba dormido, puede tardar un minuto en responder.",
      campos: {},
    };
  }
  if (!(error instanceof ErrorApi)) {
    return { general: "Ocurrió un error inesperado. Intenta de nuevo.", campos: {} };
  }

  const cuerpo = error.cuerpo || {};
  if (error.status === 429) {
    return { general: "Hiciste muchos intentos seguidos. Espera un minuto y vuelve a intentarlo.", campos: {} };
  }
  if (error.status === 403 && cuerpo.codigo === "proveedor_sin_vincular") {
    return {
      general: "Tu usuario todavía no está vinculado a un proveedor. Pídele al administrador que lo vincule.",
      campos: {},
    };
  }
  if (error.status >= 500) {
    return { general: "El servidor tuvo un problema. Intenta de nuevo en un momento.", campos: {} };
  }
  if (cuerpo.detail) return { general: String(cuerpo.detail), campos: {} };

  // 400 con errores por campo: {"cantidad": ["..."], "non_field_errors": ["..."]}
  const campos = {};
  const generales = [];
  for (const [campo, mensajes] of Object.entries(cuerpo)) {
    const texto = Array.isArray(mensajes) ? mensajes.join(" ") : String(mensajes);
    if (campo === "non_field_errors" || !(campo in NOMBRES)) generales.push(texto);
    else campos[campo] = texto;
  }
  return { general: generales.join(" ") || null, campos };
}
