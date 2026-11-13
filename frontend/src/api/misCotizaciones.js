import { apiFetch } from "./client";
import { todasLasPaginas } from "./listas";

export function listarMisCotizaciones() {
  return todasLasPaginas("/mis-cotizaciones/");
}

export function getMiCotizacion(id) {
  return apiFetch(`/mis-cotizaciones/${id}/`, { method: "GET" });
}
