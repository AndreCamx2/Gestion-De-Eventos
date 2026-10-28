import { todasLasPaginas } from "./listas";

// Solo para administrador (EsAdministrador en el backend). La usan el Inicio
// (SGDE-77), el Rack (SGDE-69) y el Calendario (SGDE-45).

// GET /api/calendario/?desde=AAAA-MM-DD&hasta=AAAA-MM-DD&salon=<id>
// → [{ id, salon, salon_nombre, cliente, cliente_nombre, montaje, montaje_nombre,
//      estado, vencida, fecha_evento, cantidad_personas, validez_oferta, bloqueo_hasta }]
// No incluye las canceladas. Las fechas son inclusivas. Antes de responder, el
// backend libera los bloqueos vencidos. Un parámetro mal formado da 400.
export async function obtenerCalendario({ desde, hasta, salon } = {}) {
  const params = new URLSearchParams();
  if (desde) params.append("desde", desde);
  if (hasta) params.append("hasta", hasta);
  if (salon) params.append("salon", salon);
  const query = params.toString();
  return todasLasPaginas(`/calendario/${query ? `?${query}` : ""}`);
}
