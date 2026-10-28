const LETRAS = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ";
const PATRON_NOMBRE = new RegExp(`^[${LETRAS}' -]+$`);
const PATRON_RAZON_SOCIAL = new RegExp(`^[${LETRAS}0-9.,&' -]+$`);
const SOLO_LETRAS = new RegExp(`[^${LETRAS}]`, "g");
const PATRON_CEDULA = /^\d{6,10}$/;
const PATRON_NIT = /^(\d{8,10})(?:-(\d))?$/;
const PATRON_TELEFONO = /^(3\d{9}|60\d{8})$/;
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PESOS_NIT = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

export const MAX_NOMBRE = 150;
export const MAX_CORREO = 254;
export const MAX_PASSWORD = 128;

export const quitarEspacios = (valor) => valor.replace(/\s+/g, " ").trim();

export const limpiarDocumento = (valor) => valor.replace(/[\s.]/g, "");

export function limpiarTelefono(valor) {
  let limpio = valor.replace(/[\s().-]/g, "");
  if (limpio.startsWith("+57")) limpio = limpio.slice(3);
  else if (limpio.startsWith("57") && limpio.length === 12) limpio = limpio.slice(2);
  return limpio;
}

export function digitoVerificacionNit(numero) {
  const suma = [...numero].reverse().reduce((total, digito, i) => total + Number(digito) * PESOS_NIT[i], 0);
  const resto = suma % 11;
  return resto < 2 ? resto : 11 - resto;
}

export function validarNombre(valor) {
  const limpio = quitarEspacios(valor);
  if (!limpio) return "Este campo es obligatorio.";
  if (!PATRON_NOMBRE.test(limpio)) return "Solo letras, sin números ni símbolos.";
  if (limpio.replace(SOLO_LETRAS, "").length < 2) return "Escribe un nombre válido.";
  if (limpio.split(" ").filter((parte) => parte.replace(SOLO_LETRAS, "").length > 0).length < 2) {
    return "Escribe nombre y apellido.";
  }
  return null;
}

export function validarRazonSocial(valor) {
  const limpio = quitarEspacios(valor);
  if (!limpio) return "Este campo es obligatorio.";
  if (limpio.length < 3 || !PATRON_RAZON_SOCIAL.test(limpio)) {
    return "Solo letras, números y los signos . , & -";
  }
  return null;
}

export function validarCedula(valor) {
  const limpio = limpiarDocumento(valor);
  if (!limpio) return "Este campo es obligatorio.";
  if (!PATRON_CEDULA.test(limpio)) return "Solo números, entre 6 y 10 dígitos.";
  return null;
}

export function validarNit(valor) {
  const limpio = limpiarDocumento(valor);
  if (!limpio) return "Este campo es obligatorio.";
  const coincidencia = limpio.match(PATRON_NIT);
  if (!coincidencia) return "Solo números, por ejemplo 900123456-8.";
  const [, numero, digito] = coincidencia;
  if (digito !== undefined && Number(digito) !== digitoVerificacionNit(numero)) {
    return "El dígito de verificación no corresponde a este NIT.";
  }
  return null;
}

export function validarTelefono(valor) {
  const limpio = limpiarTelefono(valor);
  if (!limpio) return "Este campo es obligatorio.";
  if (!PATRON_TELEFONO.test(limpio)) return "Escribe un celular de 10 dígitos o un fijo que empiece por 60.";
  return null;
}

export function validarCorreo(valor) {
  const limpio = valor.trim();
  if (!limpio) return "Este campo es obligatorio.";
  if (limpio.length > MAX_CORREO || !PATRON_CORREO.test(limpio)) {
    return "Escribe un correo válido, por ejemplo nombre@correo.com.";
  }
  return null;
}

function seParece(password, datosPersonales) {
  const clave = password.toLowerCase();
  return datosPersonales
    .flatMap((dato) => (dato ?? "").toLowerCase().split(/[\s@._-]+/))
    .filter((parte) => parte.length >= 4)
    .some((parte) => clave.includes(parte));
}

export function validarPassword(password, datosPersonales = []) {
  if (!password) return "Ingresa una contraseña.";
  if (password.length < 8) return "Debe tener mínimo 8 caracteres.";
  if (password.length > MAX_PASSWORD) return `Máximo ${MAX_PASSWORD} caracteres.`;
  if (/^\d+$/.test(password)) return "No puede ser solo números.";
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(password) || !/\d/.test(password)) {
    return "Debe tener al menos una letra y un número.";
  }
  if (seParece(password, datosPersonales)) return "No uses tu nombre, correo o documento en la contraseña.";
  return null;
}

export function validarConfirmacion(confirmacion, password) {
  if (!confirmacion) return "Confirma tu contraseña.";
  if (confirmacion !== password) return "Las contraseñas no coinciden.";
  return null;
}

export const filtrarDigitos = (valor) => valor.replace(/\D/g, "");

export const filtrarNit = (valor) => {
  const limpio = valor.replace(/[^\d-]/g, "");
  const [numero, ...resto] = limpio.split("-");
  return resto.length ? `${numero}-${resto.join("").slice(0, 1)}` : numero;
};

export const filtrarTelefono = (valor) => valor.replace(/[^\d+\s]/g, "");
