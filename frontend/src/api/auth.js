import { apiFetch } from "./client";

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

export function logout() {
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("refresh_token");
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