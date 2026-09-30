import { apiFetch } from "./client";

export async function listarClientes() {
  return apiFetch("/clientes/", { method: "GET" });
}

export async function crearCliente({ tipo, nombre, identificacion, telefono, correo, empresa, forma_pago, observaciones_internas }) {
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
