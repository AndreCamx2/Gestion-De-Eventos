import { apiFetch } from "./client";

// Solo administrador (EsAdministrador en el backend). DRF puede devolver una
// lista simple o un objeto paginado { count, results }: se aceptan ambas formas.
function comoLista(data) {
  return Array.isArray(data) ? data : data?.results ?? [];
}

// GET /api/usuarios/ → [{ id, username, rol, rol_codigo, sitios: [ids], is_active, ... }]
// Por defecto solo trae usuarios activos, y nunca superusuarios (SGDE-90).
export async function listarUsuarios({ incluirInactivos = false } = {}) {
  const query = incluirInactivos ? "?incluir_inactivos=true" : "";
  return comoLista(await apiFetch(`/usuarios/${query}`, { method: "GET" }));
}

export async function listarRoles() {
  return comoLista(await apiFetch("/roles/", { method: "GET" }));
}

export function crearUsuario(datos) {
  return apiFetch("/usuarios/", { method: "POST", body: JSON.stringify(datos) });
}

export function actualizarUsuario(id, datos) {
  return apiFetch(`/usuarios/${id}/`, { method: "PATCH", body: JSON.stringify(datos) });
}

export function darDeBajaUsuario(id) {
  return apiFetch(`/usuarios/${id}/`, { method: "DELETE" });
}
