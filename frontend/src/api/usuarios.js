import { apiFetch } from "./client";
import { todasLasPaginas } from "./listas";

export async function listarUsuarios({ incluirInactivos = false, rol } = {}) {
  const parametros = new URLSearchParams();
  if (incluirInactivos) parametros.set("incluir_inactivos", "true");
  if (rol) parametros.set("rol", rol);
  const query = parametros.size ? `?${parametros}` : "";
  return todasLasPaginas(`/usuarios/${query}`);
}

export async function listarRoles() {
  return todasLasPaginas("/roles/");
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
