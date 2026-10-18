import { api } from "./cliente";
import { todasLasPaginas } from "./listas";

// Módulo de disponibilidad y bloqueos (rol administrador). Todo está filtrado
// por los sitios del usuario en el backend (SGDE-90).

// GET /api/salones/ → [{id, nombre, sitio, sitio_nombre, ...}] (solo activos)
export function listarSalones() {
  return todasLasPaginas("/salones/");
}

// GET /api/calendario/?salon=&desde=&hasta= → cotizaciones no canceladas del rango,
// con estado efectivo (un bloqueo vencido ya llega como "cotizado") y `vencida`.
export function obtenerCalendario({ salon, desde, hasta }) {
  const params = new URLSearchParams({ salon: String(salon), desde, hasta });
  return todasLasPaginas(`/calendario/?${params}`);
}

// GET /api/cotizaciones/<id>/ → detalle con cliente, salón, montaje, totales y garantía.
export function obtenerCotizacion(id) {
  return api(`/cotizaciones/${id}/`);
}

// POST /api/cotizaciones/<id>/bloqueo/ {bloqueo_hasta} → detalle.
// 409 {detail}: no está cotizada, está vencida, el salón está de baja o la fecha
// ya está tomada. 400 {bloqueo_hasta: [...]}: hora pasada o después del evento.
export function bloquear(id, bloqueoHasta) {
  return api(`/cotizaciones/${id}/bloqueo/`, {
    method: "POST",
    body: JSON.stringify({ bloqueo_hasta: bloqueoHasta }),
  });
}

// DELETE /api/cotizaciones/<id>/bloqueo/ → detalle. 409 si no está bloqueada.
export function liberar(id) {
  return api(`/cotizaciones/${id}/bloqueo/`, { method: "DELETE" });
}
