import { todasLasPaginas } from "./listas";

export async function listarCotizaciones() {
  return todasLasPaginas("/cotizaciones/");
}
