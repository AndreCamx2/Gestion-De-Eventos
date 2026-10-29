import { apiFetch } from "./client";

export function obtenerPerfil() {
  return apiFetch("/mi-perfil/", { method: "GET" });
}

export function actualizarPerfil(cambios) {
  return apiFetch("/mi-perfil/", {
    method: "PATCH",
    body: JSON.stringify(cambios),
  });
}

export function cambiarCorreo({ correoNuevo, passwordActual }) {
  return apiFetch("/mi-perfil/correo/", {
    method: "POST",
    body: JSON.stringify({ correo_nuevo: correoNuevo, password_actual: passwordActual }),
  });
}

export async function cambiarContrasena({ passwordActual, passwordNueva }) {
  const data = await apiFetch("/mi-perfil/contrasena/", {
    method: "POST",
    body: JSON.stringify({ password_actual: passwordActual, password_nueva: passwordNueva }),
  });
  sessionStorage.setItem("access_token", data.access);
  sessionStorage.setItem("refresh_token", data.refresh);
  return data;
}
