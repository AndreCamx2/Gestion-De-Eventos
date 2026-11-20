import { api } from "./cliente";

export const TAMANO_PAGINA = 200;
export const MAX_PAGINAS = 100;

export function comoLista(datos) {
  return Array.isArray(datos) ? datos : datos?.results ?? [];
}

export async function todasLasPaginas(ruta) {
  const base = `${ruta}${ruta.includes("?") ? "&" : "?"}page_size=${TAMANO_PAGINA}`;
  const primera = await api(base);
  if (Array.isArray(primera)) return primera;

  const resultados = [...comoLista(primera)];
  let siguiente = primera?.next;
  for (let pagina = 2; siguiente && pagina <= MAX_PAGINAS; pagina += 1) {
    const datos = await api(`${base}&page=${pagina}`);
    resultados.push(...comoLista(datos));
    siguiente = datos?.next;
  }
  return resultados;
}
