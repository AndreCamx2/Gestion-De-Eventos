const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LARGO_MINIMO_CLAVE = 8;

export const MENSAJE_SIN_SERVIDOR = "No pudimos hablar con el servidor. Intenta de nuevo.";
export const MENSAJE_DEMASIADOS_INTENTOS = "Hiciste muchos intentos seguidos. Espera un rato y vuelve a intentarlo.";

export function validarCorreo(email) {
  if (!email) return "Ingresa tu correo electrónico.";
  if (!FORMATO_CORREO.test(email)) return "Escribe un correo válido, por ejemplo nombre@correo.com.";
  return null;
}

export function validarClaves(password, confirmacion) {
  const errores = {};
  if (!password) {
    errores.password = "Ingresa tu nueva contraseña.";
  } else if (password.length < LARGO_MINIMO_CLAVE) {
    errores.password = `Debe tener mínimo ${LARGO_MINIMO_CLAVE} caracteres.`;
  }
  if (!confirmacion) {
    errores.confirmacion = "Confirma tu nueva contraseña.";
  } else if (password && confirmacion !== password) {
    errores.confirmacion = "Las contraseñas no coinciden.";
  }
  return errores;
}

export function unirMensajes(mensajes) {
  return Array.isArray(mensajes) ? mensajes.join(" ") : mensajes;
}

export function mensajeGeneral(err) {
  if (err?.status === 429) return MENSAJE_DEMASIADOS_INTENTOS;
  return MENSAJE_SIN_SERVIDOR;
}
