import {
  MAX_CORREO,
  MAX_NOMBRE,
  filtrarDigitos,
  filtrarNit,
  filtrarTelefono,
  validarCedula,
  validarConfirmacion,
  validarCorreo,
  validarNit,
  validarNombre,
  validarPassword,
  validarRazonSocial,
  validarTelefono,
} from "../../utils/validacionesRegistro";

export const ACCOUNT_TYPES = {
  natural: {
    label: "Persona natural",
    fields: [
      { name: "fullName", label: "Nombre completo", type: "text", placeholder: "Maria Bustamante", full: true, autoComplete: "name", maxLength: MAX_NOMBRE, validar: validarNombre },
      { name: "documentId", label: "Cédula / Documento", type: "text", placeholder: "1234567890", inputMode: "numeric", maxLength: 10, filtro: filtrarDigitos, validar: validarCedula },
      { name: "phoneNatural", label: "Teléfono", type: "tel", placeholder: "300 000 0000", autoComplete: "tel", inputMode: "tel", maxLength: 16, filtro: filtrarTelefono, validar: validarTelefono },
      { name: "emailNatural", label: "Correo electrónico", type: "email", placeholder: "maria@correo.com", autoComplete: "email", maxLength: MAX_CORREO, validar: validarCorreo },
    ],
  },
  empresa: {
    label: "Empresa / Institución",
    fields: [
      { name: "companyName", label: "Razón social", type: "text", placeholder: "Eventos del Caribe S.A.S.", full: true, autoComplete: "organization", maxLength: MAX_NOMBRE, validar: validarRazonSocial },
      { name: "taxId", label: "NIT", type: "text", placeholder: "900123456-8", inputMode: "numeric", maxLength: 12, filtro: filtrarNit, validar: validarNit },
      { name: "contactName", label: "Nombre del contacto", type: "text", placeholder: "Carlos Pérez", autoComplete: "name", maxLength: MAX_NOMBRE, validar: validarNombre },
      { name: "phoneEmpresa", label: "Teléfono", type: "tel", placeholder: "300 000 0000", autoComplete: "tel", inputMode: "tel", maxLength: 16, filtro: filtrarTelefono, validar: validarTelefono },
      { name: "emailEmpresa", label: "Correo corporativo", type: "email", placeholder: "contacto@empresa.com", autoComplete: "email", maxLength: MAX_CORREO, validar: validarCorreo },
    ],
  },
};

export const INITIAL_FORM = {
  fullName: "", documentId: "", phoneNatural: "", emailNatural: "",
  companyName: "", taxId: "", contactName: "", phoneEmpresa: "", emailEmpresa: "",
  password: "", confirmPassword: "",
};

function datosPersonales(form, accountType) {
  return accountType === "natural"
    ? [form.fullName, form.emailNatural, form.documentId]
    : [form.contactName, form.emailEmpresa, form.taxId, form.companyName];
}

export function validarCampo(name, form, accountType) {
  if (name === "password") return validarPassword(form.password, datosPersonales(form, accountType));
  if (name === "confirmPassword") return validarConfirmacion(form.confirmPassword, form.password);
  const campo = ACCOUNT_TYPES[accountType].fields.find((field) => field.name === name);
  return campo ? campo.validar(form[name] ?? "") : null;
}
