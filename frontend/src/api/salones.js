import { apiFetch } from "./client";

// Todo este módulo es solo para administrador (EsAdministrador en el backend).
// DRF puede devolver una lista simple o un objeto paginado { count, results },
// así que las listas aceptan ambas formas.
function comoLista(data) {
  return Array.isArray(data) ? data : data?.results ?? [];
}

// "4,5" → "4.5": en Colombia se escribe con coma; el API espera punto.
// Vacío → null: ancho y altura son opcionales y un "" no es un número válido.
function decimalOpcional(valor) {
  const limpio = String(valor ?? "").trim().replace(",", ".");
  return limpio === "" ? null : limpio;
}

// GET /api/salones/ → [{ id, sitio, nombre, altura, ancho, foto_url, activo }]
// Solo los activos, salvo incluirInactivos (SGDE-99).
export async function listarSalones({ incluirInactivos = false } = {}) {
  const query = incluirInactivos ? "?incluir_inactivos=true" : "";
  return comoLista(await apiFetch(`/salones/${query}`, { method: "GET" }));
}

// POST /api/salones/. El nombre es único dentro de cada sitio.
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

// GET /api/montajes/ → catálogo: [{ id, codigo, nombre, descripcion }]
export async function listarMontajes() {
  return comoLista(await apiFetch("/montajes/", { method: "GET" }));
}

// GET /api/salon-montajes/ → [{ id, salon, montaje, aforo, foto_url }]
// No tiene filtros: trae todos y la pantalla los agrupa por salón.
export async function listarSalonMontajes() {
  return comoLista(await apiFetch("/salon-montajes/", { method: "GET" }));
}

// POST /api/salon-montajes/. Un montaje no se repite en el mismo salón.
export function habilitarMontaje({ salon, montaje, aforo }) {
  return apiFetch("/salon-montajes/", {
    method: "POST",
    body: JSON.stringify({ salon, montaje, aforo }),
  });
}

// PATCH /api/salones/<id>/ con solo lo que cambió: nombre, ancho, altura o
// foto_url (SGDE-88). El sitio no se puede cambiar (el API da 400).
export function editarSalon(id, cambios) {
  const body = { ...cambios };
  if ("nombre" in body) body.nombre = body.nombre.trim();
  if ("ancho" in body) body.ancho = decimalOpcional(body.ancho);
  if ("altura" in body) body.altura = decimalOpcional(body.altura);
  if ("foto_url" in body) body.foto_url = body.foto_url.trim();
  return apiFetch(`/salones/${id}/`, { method: "PATCH", body: JSON.stringify(body) });
}

// PATCH /api/salon-montajes/<id>/ con el aforo nuevo. Menor que una cotización
// activa de ese salón y montaje → 400 en "aforo".
export function editarAforo(id, aforo) {
  return apiFetch(`/salon-montajes/${id}/`, { method: "PATCH", body: JSON.stringify({ aforo }) });
}

// DELETE /api/salon-montajes/<id>/ → 204. Con cotizaciones activas → 409, con
// un detail que dice cuántas son.
export function quitarMontaje(id) {
  return apiFetch(`/salon-montajes/${id}/`, { method: "DELETE" });
}

// PATCH /api/salones/<id>/ con { activo } (SGDE-99): la baja es lógica. Darlo de
// baja con cotizaciones activas → 409, con un detail que dice cuántas son.
export function cambiarActivoSalon(id, activo) {
  return apiFetch(`/salones/${id}/`, { method: "PATCH", body: JSON.stringify({ activo }) });
}
