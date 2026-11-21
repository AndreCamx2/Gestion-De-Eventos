// Versión móvil de frontend/src/api/perfil.js: los tokens nuevos se guardan en SecureStore.
import { CLAVES, guardar } from "../../api/almacen";
import { apiFetch } from "./client";

export function obtenerPerfil() {
  return apiFetch("/mi-perfil/", { method: "GET" });
}

export function actualizarPerfil(cambios) {
  return apiFetch("/mi-perfil/", { method: "PATCH", body: JSON.stringify(cambios) });
}

export function cambiarCorreo({ correoNuevo, passwordActual }) {
  return apiFetch("/mi-perfil/correo/", {
    method: "POST",
    body: JSON.stringify({ correo_nuevo: correoNuevo, password_actual: passwordActual }),
  });
}

// Cambiar la contraseña invalida los tokens viejos: el backend devuelve unos nuevos.
export async function cambiarContrasena({ passwordActual, passwordNueva }) {
  const data = await apiFetch("/mi-perfil/contrasena/", {
    method: "POST",
    body: JSON.stringify({ password_actual: passwordActual, password_nueva: passwordNueva }),
  });
  await guardar(CLAVES.access, data.access);
  await guardar(CLAVES.refresh, data.refresh);
  return data;
}
