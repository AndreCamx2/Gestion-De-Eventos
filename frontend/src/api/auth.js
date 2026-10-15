import { apiFetch, API_URL } from "./client";

// Tiempo máximo para avisar al servidor del cierre de sesión (SGDE-92).
const ESPERA_MAXIMA_LOGOUT_MS = 5000;

export async function login(username, password) {
  const data = await apiFetch("/token/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
    skipAuth: true,
  });

  sessionStorage.setItem("access_token", data.access);
  sessionStorage.setItem("refresh_token", data.refresh);

  return data;
}

export async function getUsuarioActual() {
  return apiFetch("/usuarios/me/", { method: "GET" });
}

// Cierra la sesión (SGDE-92).
// 1. Borra los tokens de inmediato: la persona sale al instante, pase lo que pase.
// 2. Avisa al servidor para que ese refresh deje de servir (lista negra).
//    - fetch directo y no apiFetch: un error aquí no debe intentar renovar.
//    - keepalive: el aviso llega aunque la página cambie o se cierre la pestaña.
//    - Como máximo ESPERA_MAXIMA_LOGOUT_MS; después se abandona.
// Devuelve una promesa que nunca falla: no hace falta esperarla. Si no hay red,
// ese refresh sigue sirviendo hasta que vence (límite aceptado).
export function logout() {
  const refresh = sessionStorage.getItem("refresh_token");
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("refresh_token");
  if (!refresh) return Promise.resolve();

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), ESPERA_MAXIMA_LOGOUT_MS);
  return fetch(`${API_URL}/token/logout/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
    keepalive: true,
    signal: control.signal,
  })
    .catch(() => {})
    .finally(() => clearTimeout(temporizador))
    .then(() => undefined);
}

export async function registrarCliente({
  tipo,
  nombre,
  identificacion,
  telefono,
  email,
  password,
  razonSocial,
  ciudad = "CTG",
}) {
  const body = {
    tipo,
    nombre,
    identificacion,
    telefono,
    email,
    password,
    ciudad,
  };

  if (tipo === "juridica") {
    body.razon_social = razonSocial;
  }

  return apiFetch("/registro/", {
    method: "POST",
    body: JSON.stringify(body),
    skipAuth: true,
  });
}
export function solicitarRecuperacion(email) {
  return apiFetch("/clave/recuperar/", {
    method: "POST",
    body: JSON.stringify({ email }),
    skipAuth: true,
  });
}

export function restablecerClave({ uid, token, password }) {
  return apiFetch("/clave/restablecer/", {
    method: "POST",
    body: JSON.stringify({ uid, token, password }),
    skipAuth: true,
  });
}
