import { api } from "./cliente";
import { todasLasPaginas } from "./listas";

export function listarSalones() {
  return todasLasPaginas("/salones/");
}

export function obtenerCalendario({ salon, desde, hasta }) {
  const params = new URLSearchParams({ salon: String(salon), desde, hasta });
  return todasLasPaginas(`/calendario/?${params}`);
}

export function obtenerCotizacion(id) {
  return api(`/cotizaciones/${id}/`);
}

export function bloquear(id, bloqueoHasta) {
  return api(`/cotizaciones/${id}/bloqueo/`, {
    method: "POST",
    body: JSON.stringify({ bloqueo_hasta: bloqueoHasta }),
  });
}

export function liberar(id) {
  return api(`/cotizaciones/${id}/bloqueo/`, { method: "DELETE" });
}
