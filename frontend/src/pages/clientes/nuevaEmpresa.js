import { erroresDesdeApi } from "../../utils/erroresApi";

export const EMPRESA_VACIA = { razon_social: "", identificacion: "", contacto: "", correo: "", ciudad: "" };

const CAMPOS = ["razon_social", "identificacion", "contacto", "correo", "ciudad"];

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarEmpresa(form) {
  const errores = {};
  if (!form.razon_social.trim()) errores.razon_social = "Escribe la razón social.";
  else if (form.razon_social.trim().length > 150) errores.razon_social = "Máximo 150 caracteres.";
  if (!form.identificacion.trim()) errores.identificacion = "Escribe el NIT de la empresa.";
  else if (form.identificacion.trim().length > 30) errores.identificacion = "Máximo 30 caracteres.";
  if (form.contacto.trim().length > 120) errores.contacto = "Máximo 120 caracteres.";
  if (form.correo.trim() && !CORREO_VALIDO.test(form.correo.trim())) errores.correo = "Escribe un correo válido.";
  return errores;
}

export function payloadEmpresa(form) {
  return {
    razon_social: form.razon_social.trim(),
    identificacion: form.identificacion.trim(),
    contacto: form.contacto.trim(),
    correo: form.correo.trim(),
    ciudad: form.ciudad ? Number(form.ciudad) : null,
  };
}

const MSG_NIT_DUPLICADO = "Ya existe una empresa con ese NIT. Búscala en la lista de empresas.";

export function erroresEmpresa(body) {
  const { campos, general } = erroresDesdeApi(body, CAMPOS);
  if (campos.identificacion && /existe|unique|únic/i.test(campos.identificacion)) {
    campos.identificacion = MSG_NIT_DUPLICADO;
  }
  return { campos, general };
}

export function mensajeErrorEmpresa(status) {
  if (status === 403) return "No tienes permiso para crear empresas.";
  return "No pudimos hablar con el servidor. Inténtalo de nuevo.";
}
