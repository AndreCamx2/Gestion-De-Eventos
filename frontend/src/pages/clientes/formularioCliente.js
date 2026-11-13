import { erroresDesdeApi as erroresDesdeApiComun } from "../../utils/erroresApi";
import { validarCedula, validarCorreo, validarNombre, validarTelefono } from "../../utils/validacionesRegistro";

export const MAX_FORMA_PAGO = 50;
export const MAX_OBSERVACIONES = 2000;

export const FORM_VACIO = {
  tipo: "natural",
  nombre: "",
  identificacion: "",
  telefono: "",
  correo: "",
  empresa: "",
  forma_pago: "",
  observaciones_internas: "",
};

export function formDesdeCliente(c) {
  return {
    tipo: c.tipo,
    nombre: c.nombre ?? "",
    identificacion: c.identificacion ?? "",
    telefono: c.telefono ?? "",
    correo: c.correo ?? "",
    empresa: c.empresa ? String(c.empresa) : "",
    forma_pago: c.forma_pago ?? "",
    observaciones_internas: c.observaciones_internas ?? "",
  };
}

export function nitDeEmpresa(empresas, empresaId) {
  if (!empresaId) return "";
  const emp = empresas.find((e) => e.id === Number(empresaId));
  return emp?.identificacion ?? "";
}

const CAMPOS = [
  "tipo", "nombre", "identificacion", "telefono", "correo",
  "empresa", "forma_pago", "observaciones_internas",
];

// "cliente_inactivo" no es un campo: es el id del cliente con esa identificación.
export function erroresDesdeApi(body) {
  const { cliente_inactivo, ...resto } = body ?? {};
  const { campos, general } = erroresDesdeApiComun(resto, CAMPOS);
  if (cliente_inactivo != null) campos.cliente_inactivo = cliente_inactivo;
  return { campos, general };
}

// En jurídica no se envía identificación: el NIT es el de su empresa.
export function payloadEdicion(form) {
  const body = {
    tipo: form.tipo,
    nombre: form.nombre,
    telefono: form.telefono,
    correo: form.correo,
    empresa: form.empresa ? Number(form.empresa) : null,
    forma_pago: form.forma_pago,
    observaciones_internas: form.observaciones_internas,
  };
  if (form.tipo !== "juridica") {
    // null y no "": es única en la base.
    body.identificacion = form.identificacion.trim() || null;
  }
  return body;
}

// Mismas reglas que ClienteAdminSerializer. La identificación solo es obligatoria al
// crear un natural: un cliente viejo puede no tenerla.
export function validarCliente(form, { esCrear }) {
  const errores = {};
  const nombre = validarNombre(form.nombre, { conApellido: false });
  if (nombre) errores.nombre = nombre;
  if (form.tipo === "natural" && (esCrear || form.identificacion.trim())) {
    const cedula = validarCedula(form.identificacion);
    if (cedula) {
      errores.identificacion = form.identificacion.trim()
        ? cedula
        : "La identificación es obligatoria para personas naturales.";
    }
  }
  if (form.tipo === "juridica" && !form.empresa) errores.empresa = "Elige la empresa del cliente.";
  if (form.telefono.trim()) {
    const telefono = validarTelefono(form.telefono);
    if (telefono) errores.telefono = telefono;
  }
  if (form.correo.trim()) {
    const correo = validarCorreo(form.correo);
    if (correo) errores.correo = correo;
  }
  if (form.forma_pago.trim().length > MAX_FORMA_PAGO) errores.forma_pago = `Máximo ${MAX_FORMA_PAGO} caracteres.`;
  if (form.observaciones_internas.length > MAX_OBSERVACIONES) {
    errores.observaciones_internas = `Máximo ${MAX_OBSERVACIONES} caracteres.`;
  }
  return errores;
}
