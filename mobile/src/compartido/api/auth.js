// Versión móvil de frontend/src/api/auth.js. Entrar y salir los maneja la sesión
// del celular (src/sesion/Sesion.js); aquí queda lo que usan las pantallas compartidas.
import { apiFetch } from "./client";

export function getUsuarioActual() {
  return apiFetch("/usuarios/me/", { method: "GET" });
}

export function registrarCliente({ tipo, nombre, identificacion, telefono, email, password, razonSocial, ciudad = "CTG" }) {
  const body = { tipo, nombre, identificacion, telefono, email, password, ciudad };
  if (tipo === "juridica") body.razon_social = razonSocial;
  return apiFetch("/registro/", { method: "POST", body: JSON.stringify(body), skipAuth: true });
}

export function solicitarRecuperacion(email) {
  return apiFetch("/clave/recuperar/", { method: "POST", body: JSON.stringify({ email }), skipAuth: true });
}

export function restablecerClave({ uid, token, password }) {
  return apiFetch("/clave/restablecer/", {
    method: "POST",
    body: JSON.stringify({ uid, token, password }),
    skipAuth: true,
  });
}
