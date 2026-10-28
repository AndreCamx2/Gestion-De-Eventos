import { validarConfirmacion, validarCorreo, validarPassword, validarTelefono } from "../../utils/validacionesRegistro";

export const MAX_CONTACTO = 120;

export const CODIGOS_SIN_VINCULAR = ["proveedor_sin_vincular", "cliente_sin_vincular"];

export function tipoDeError(err) {
  if (err?.status === 401) return "sesion";
  if (err?.status === 403) return CODIGOS_SIN_VINCULAR.includes(err.body?.codigo) ? "sinVincular" : "permiso";
  return "servidor";
}

export function campoEditable(rol) {
  return rol === "cliente" ? "telefono" : "contacto";
}

export function validarDato(rol, valor) {
  const limpio = valor.trim();
  if (rol === "cliente") return limpio ? validarTelefono(limpio) : null;
  if (limpio.length > MAX_CONTACTO) return `El contacto admite máximo ${MAX_CONTACTO} caracteres.`;
  return null;
}

export function validarCambioCorreo(form, correoActual) {
  const errores = {};
  const error = validarCorreo(form.correo_nuevo);
  if (error) errores.correo_nuevo = error;
  else if (form.correo_nuevo.trim().toLowerCase() === (correoActual ?? "").toLowerCase())
    errores.correo_nuevo = "Es el mismo correo que ya tienes.";
  if (!form.password_actual) errores.password_actual = "Escribe tu contraseña actual.";
  return errores;
}

export function validarCambioContrasena(form, datosPersonales) {
  const errores = {};
  if (!form.password_actual) errores.password_actual = "Escribe tu contraseña actual.";
  const nueva = validarPassword(form.password_nueva, datosPersonales);
  if (nueva) errores.password_nueva = nueva;
  else if (form.password_nueva === form.password_actual)
    errores.password_nueva = "La contraseña nueva debe ser distinta de la actual.";
  const confirmacion = validarConfirmacion(form.confirmacion, form.password_nueva);
  if (confirmacion) errores.confirmacion = confirmacion;
  return errores;
}

export function textoTipo(tipo) {
  return tipo === "juridica" ? "Jurídica" : "Natural";
}
