import { apiFetch } from "./client";

// Peticiones del Inicio del administrador (SGDE-77). Ambas son solo para
// administrador: el Inicio de cliente y proveedor no las llama (el API les da 403).
// DRF puede devolver una lista simple o un objeto paginado { count, results }.
function comoLista(data) {
  return Array.isArray(data) ? data : data?.results ?? [];
}

// GET /api/cotizaciones/ → [{ id, estado, vencida, cliente_nombre, salon_nombre,
// fecha_evento, cantidad_personas, validez_oferta, total }]
export async function listarCotizaciones() {
  return comoLista(await apiFetch("/cotizaciones/", { method: "GET" }));
}

// GET /api/calendario/?desde=AAAA-MM-DD&hasta=AAAA-MM-DD → [{ id, salon,
// salon_nombre, cliente, cliente_nombre, estado, fecha_evento, cantidad_personas }]
// No incluye las canceladas. Las fechas son inclusivas.
export async function listarCalendario({ desde, hasta }) {
  const query = new URLSearchParams({ desde, hasta }).toString();
  return comoLista(await apiFetch(`/calendario/?${query}`, { method: "GET" }));
}
