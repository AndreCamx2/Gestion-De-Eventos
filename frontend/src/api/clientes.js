import { apiFetch } from "./client";
import { todasLasPaginas } from "./listas";

export async function listarClientes({ incluirInactivos = false } = {}) {
  const query = incluirInactivos ? "?incluir_inactivos=true" : "";
  return todasLasPaginas(`/clientes/${query}`);
}

// PATCH: se envía solo lo que el formulario edita. El API valida que la
// empresa exista si el tipo es jurídica.
export async function actualizarCliente(id, datos) {
  return apiFetch(`/clientes/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(datos),
  });
}

// Baja lógica: el API pone Cliente.activo=False y Usuario.is_active=False.
export async function darDeBajaCliente(id) {
  return apiFetch(`/clientes/${id}/`, { method: "DELETE" });
}

// Reactivar (SGDE-95): activo=True en el Cliente y en su Usuario, si tiene.
export async function reactivarCliente(id) {
  return actualizarCliente(id, { activo: true });
}

export async function listarEmpresas() {
  return todasLasPaginas("/empresas/");
}

export async function crearCliente({
  tipo,
  nombre,
  identificacion,
  telefono,
  correo,
  empresa,
  forma_pago,
  observaciones_internas,
}) {
  const body = { tipo, nombre };

  // En jurídica no se envía identificacion: el NIT vive en la empresa.
  if (tipo === "juridica") {
    body.empresa = empresa;
  } else {
    body.identificacion = identificacion;
    if (empresa) body.empresa = empresa;
  }

  if (telefono) body.telefono = telefono;
  if (correo) body.correo = correo;
  if (forma_pago) body.forma_pago = forma_pago;
  if (observaciones_internas) body.observaciones_internas = observaciones_internas;

  return apiFetch("/clientes/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function buscarClientes(texto = "") {
  const query = texto ? `?search=${encodeURIComponent(texto)}` : "";
  return todasLasPaginas(`/clientes/${query}`);
}

export async function crearEmpresa(datos) {
  return apiFetch("/empresas/", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}
