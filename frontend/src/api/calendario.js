import { todasLasPaginas } from "./listas";

export async function obtenerCalendario({ desde, hasta, salon } = {}) {
  const params = new URLSearchParams();
  if (desde) params.append("desde", desde);
  if (hasta) params.append("hasta", hasta);
  if (salon) params.append("salon", salon);
  const query = params.toString();
  return todasLasPaginas(`/calendario/${query ? `?${query}` : ""}`);
}
