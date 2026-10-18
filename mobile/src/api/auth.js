import { CLAVES, borrarTokens, guardar, leer } from "./almacen";
import { api } from "./cliente";

// POST /api/token/ → {access, refresh}. 401 = usuario o contraseña incorrectos;
// 429 = demasiados intentos seguidos (SGDE-112).
export async function iniciarSesion(usuario, clave) {
  const tokens = await api("/token/", {
    publica: true,
    method: "POST",
    body: JSON.stringify({ username: usuario.trim(), password: clave }),
  });
  await guardar(CLAVES.access, tokens.access);
  await guardar(CLAVES.refresh, tokens.refresh);
}

// GET /api/usuarios/me/ → {id, username, first_name, email, rol: {codigo, nombre}, sitios, proveedor}
export function usuarioActual() {
  return api("/usuarios/me/");
}

export async function haySesionGuardada() {
  return Boolean(await leer(CLAVES.refresh));
}

// Cierra sesión (SGDE-92): borra los tokens primero, para que salir nunca se
// quede colgado, y avisa al servidor para poner el refresh en la lista negra.
export async function cerrarSesion() {
  const refresh = await leer(CLAVES.refresh);
  await borrarTokens();
  if (!refresh) return;
  try {
    await api("/token/logout/", { publica: true, method: "POST", body: JSON.stringify({ refresh }) });
  } catch {
    // Sin red, el refresh sigue sirviendo hasta que vence: es el límite aceptado de SGDE-92.
  }
}
