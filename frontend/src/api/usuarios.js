import { apiFetch } from "./client";

// Solo administrador (EsAdministrador en el backend). DRF puede devolver una
// lista simple o un objeto paginado { count, results }: se aceptan ambas formas.
function comoLista(data) {
  return Array.isArray(data) ? data : data?.results ?? [];
}

// GET /api/usuarios/ → [{ id, username, rol, rol_codigo, sitios: [ids], is_active, ... }]
// Por defecto solo trae usuarios activos, y nunca superusuarios (SGDE-90).
export async function listarUsuarios() {
  return comoLista(await apiFetch("/usuarios/", { method: "GET" }));
}
