import { CLAVES, borrarTokens, guardar, leer } from "./almacen";
import { api } from "./cliente";

export async function iniciarSesion(usuario, clave) {
  const tokens = await api("/token/", {
    publica: true,
    method: "POST",
    body: JSON.stringify({ username: usuario.trim(), password: clave }),
  });
  await guardar(CLAVES.access, tokens.access);
  await guardar(CLAVES.refresh, tokens.refresh);
}

export function usuarioActual() {
  return api("/usuarios/me/");
}

export async function haySesionGuardada() {
  return Boolean(await leer(CLAVES.refresh));
}

export async function cerrarSesion() {
  const refresh = await leer(CLAVES.refresh);
  await borrarTokens();
  if (!refresh) return;
  try {
    await api("/token/logout/", { publica: true, method: "POST", body: JSON.stringify({ refresh }) });
  } catch {
  }
}
