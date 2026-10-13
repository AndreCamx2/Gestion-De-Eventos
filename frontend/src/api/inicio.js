import { apiFetch } from "./client";

// Peticiones del Inicio del administrador (SGDE-77). Es solo para
// administrador: el Inicio de cliente y proveedor no la llama (el API les da 403).
// El calendario está en api/calendario.js (obtenerCalendario).
// DRF puede devolver una lista simple o un objeto paginado { count, results }.
function comoLista(data) {
  return Array.isArray(data) ? data : data?.results ?? [];
}

// GET /api/cotizaciones/ → [{ id, estado, vencida, cliente_nombre, salon_nombre,
// montaje_nombre, fecha_evento, cantidad_personas, validez_oferta, bloqueo_hasta,
// creado_en, confirmado_en, total, garantia }]
// confirmado_en es null si no se ha confirmado o si se confirmó a mano en /admin/.
// garantia es null o { tipo, monto, registrada_en, registrada_por }.
export async function listarCotizaciones() {
  return comoLista(await apiFetch("/cotizaciones/", { method: "GET" }));
}
