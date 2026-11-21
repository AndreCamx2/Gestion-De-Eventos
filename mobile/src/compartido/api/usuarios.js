import { apiFetch } from "./client";
import { todasLasPaginas } from "./listas";

export async function listarUsuarios({ incluirInactivos = false, rol } = {}) {
  const parametros = new URLSearchParams();
  // Cambio frente a la web: el URLSearchParams de React Native no tiene set() ni size.
  if (incluirInactivos) parametros.append("incluir_inactivos", "true");
  if (rol) parametros.append("rol", rol);
  const texto = parametros.toString();
  const query = texto ? `?${texto}` : "";
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
