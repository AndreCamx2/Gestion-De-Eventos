// Endpoints que usa la app y que la web todavía no tiene en frontend/src/api.
import { api } from "./cliente";
import { todasLasPaginas } from "./listas";

// Detalle de un cliente con su historial de cotizaciones.
export function obtenerCliente(id) {
  return api(`/clientes/${id}/`);
}

// Cambios de cantidad y valor de un elemento de stock.
export function historialMiStock(id) {
  return todasLasPaginas(`/mi-stock/${id}/historial/`);
}

export function historialStock(id) {
  return todasLasPaginas(`/stock/${id}/historial/`);
}
