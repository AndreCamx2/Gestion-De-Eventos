import { apiFetch } from "./client";
import { todasLasPaginas } from "./listas";

// "Mis cotizaciones" del rol cliente (SGDE-126): solo lectura y solo las del
// cliente que inició sesión (el backend filtra por el token). 403 con
// codigo "cliente_sin_vincular" si el usuario aún no tiene un Cliente vinculado.

export function listarMisCotizaciones() {
  return todasLasPaginas("/mis-cotizaciones/");
}

// Mismo formato que el detalle del administrador, sin los datos internos.
// 404 si no existe o es de otro cliente.
export function getMiCotizacion(id) {
  return apiFetch(`/mis-cotizaciones/${id}/`, { method: "GET" });
}
