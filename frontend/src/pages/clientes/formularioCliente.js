// Datos del formulario de cliente que no son componentes: el formulario vacío,
// cómo se llena desde un cliente, el NIT de su empresa, la lectura de errores
// del API y el cuerpo del PATCH. Viven fuera de ClienteForm.jsx porque un .jsx
// solo exporta componentes (react-refresh, SGDE-55). Los usan ClienteForm.jsx y useClientes.js.
// Antes se llamaba clienteForm.js: en Windows chocaba con ClienteForm.jsx por la
// mayúscula (SGDE-97).
import { erroresDesdeApi as erroresDesdeApiComun } from "../../utils/erroresApi";

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

// El NIT de una persona jurídica vive en Empresa.identificacion (igual que en el
// registro público). Aquí solo se lee de la lista de empresas que ya tiene la pantalla.
export function nitDeEmpresa(empresas, empresaId) {
  if (!empresaId) return "";
  const emp = empresas.find((e) => e.id === Number(empresaId));
  return emp?.identificacion ?? "";
}

const CAMPOS = [
  "tipo", "nombre", "identificacion", "telefono", "correo",
  "empresa", "forma_pago", "observaciones_internas",
];

// Separa los errores 400 del API usando el clasificador compartido de utils/,
// con la lista de campos de este formulario.
// "cliente_inactivo" (SGDE-107) no es un campo: es el id del cliente inactivo que
// ya tiene esa identificación. Se aparta para que no salga como error general y
// va en campos.cliente_inactivo, para el botón "Ver el cliente inactivo".
export function erroresDesdeApi(body) {
  const { cliente_inactivo, ...resto } = body ?? {};
  const { campos, general } = erroresDesdeApiComun(resto, CAMPOS);
  if (cliente_inactivo != null) campos.cliente_inactivo = cliente_inactivo;
  return { campos, general };
}

// Cuerpo del PATCH. En jurídica NO se envía identificacion: el NIT es el de su
// empresa y el backend deja la del cliente en null (SGDE-87; la base de datos lo
// exige desde SGDE-91). Al pasar un natural a jurídico, el backend la borra solo.
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
    // identificacion es única en la BD: vacía se envía null (el backend también
    // convierte "" en null desde SGDE-91).
    body.identificacion = form.identificacion.trim() || null;
  }
  return body;
}
