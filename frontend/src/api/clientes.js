import { apiFetch } from "./client";

export async function listarClientes({ incluirInactivos = false } = {}) {
  const query = incluirInactivos ? "?incluir_inactivos=true" : "";
  return apiFetch(`/clientes/${query}`, { method: "GET" });
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

export async function listarEmpresas() {
  return apiFetch("/empresas/", { method: "GET" });
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

  if (tipo === "juridica") {
    body.empresa = empresa;
  } else {
    body.identificacion = identificacion;
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
