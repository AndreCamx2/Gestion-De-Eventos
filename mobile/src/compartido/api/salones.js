import { apiFetch } from "./client";
import { todasLasPaginas } from "./listas";

// "4,5" → "4.5": en Colombia se escribe con coma; el API espera punto.
function decimalOpcional(valor) {
  const limpio = String(valor ?? "").trim().replace(",", ".");
  return limpio === "" ? null : limpio;
}

export async function listarSalones({ incluirInactivos = false } = {}) {
  const query = incluirInactivos ? "?incluir_inactivos=true" : "";
  return todasLasPaginas(`/salones/${query}`);
}

export function crearSalon({ sitio, nombre, ancho, altura, foto_url }) {
  return apiFetch("/salones/", {
    method: "POST",
    body: JSON.stringify({
      sitio,
      nombre: nombre.trim(),
      ancho: decimalOpcional(ancho),
      altura: decimalOpcional(altura),
      foto_url: foto_url.trim(),
    }),
  });
}

export async function listarMontajes() {
  return todasLasPaginas("/montajes/");
}

export async function listarSalonMontajes() {
  return todasLasPaginas("/salon-montajes/");
}

export function habilitarMontaje({ salon, montaje, aforo }) {
  return apiFetch("/salon-montajes/", {
    method: "POST",
    body: JSON.stringify({ salon, montaje, aforo }),
  });
}

export function editarSalon(id, cambios) {
  const body = { ...cambios };
  if ("nombre" in body) body.nombre = body.nombre.trim();
  if ("ancho" in body) body.ancho = decimalOpcional(body.ancho);
  if ("altura" in body) body.altura = decimalOpcional(body.altura);
  if ("foto_url" in body) body.foto_url = body.foto_url.trim();
  return apiFetch(`/salones/${id}/`, { method: "PATCH", body: JSON.stringify(body) });
}

export function editarAforo(id, aforo) {
  return apiFetch(`/salon-montajes/${id}/`, { method: "PATCH", body: JSON.stringify({ aforo }) });
}

export function quitarMontaje(id) {
  return apiFetch(`/salon-montajes/${id}/`, { method: "DELETE" });
}

export function cambiarActivoSalon(id, activo) {
  return apiFetch(`/salones/${id}/`, { method: "PATCH", body: JSON.stringify({ activo }) });
}
