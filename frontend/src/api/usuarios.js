import { apiFetch } from "./client";

// DRF puede devolver una lista simple o un objeto paginado { count, results }.
const comoLista = (data) => (Array.isArray(data) ? data : data?.results ?? []);

// GET /api/usuarios/ (solo administrador)
export async function listarUsuarios({ incluirInactivos = false } = {}) {
  const query = incluirInactivos ? "?incluir_inactivos=true" : "";
  return comoLista(await apiFetch(`/usuarios/${query}`, { method: "GET" }));
}

// POST /api/usuarios/ -> crea un usuario interno.
// `rol` es el id del rol (clave primaria) y `sitios` una lista de ids.
// Si el backend espera esto en /usuarios/registro/, cambia solo la ruta de aquí.
export function crearUsuario({ username, email, password, rol, sitios }) {
  return apiFetch("/usuarios/", {
    method: "POST",
    body: JSON.stringify({ username, email, password, rol, sitios }),
  });
}

// PATCH /api/usuarios/<id>/ -> solo se envían los campos que cambiaron.
export function actualizarUsuario(id, cambios) {
  return apiFetch(`/usuarios/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(cambios),
  });
}

// DELETE /api/usuarios/<id>/ -> baja lógica (el usuario queda inactivo).
export function darDeBajaUsuario(id) {
  return apiFetch(`/usuarios/${id}/`, { method: "DELETE" });
}

// PATCH /api/usuarios/<id>/ -> reactiva un usuario dado de baja.
export function reactivarUsuario(id) {
  return actualizarUsuario(id, { is_active: true });
}

// GET /api/roles/ -> [{ id, codigo, nombre }]
export async function listarRoles() {
  return comoLista(await apiFetch("/roles/", { method: "GET" }));
}
