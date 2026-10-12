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

// GET /api/salones/ → [{ id, sitio, nombre, altura, ancho, foto_url }]
export async function listarSalones() {
  return comoLista(await apiFetch("/salones/", { method: "GET" }));
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
