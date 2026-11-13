import { apiFetch } from "./client";

export const TAMANO_PAGINA = 200;

// Tope de páginas por lista: si el API respondiera siempre con `next`, la carga
// se corta aquí en vez de quedarse pidiendo páginas sin fin.
export const MAX_PAGINAS = 100;

export function comoLista(data) {
  return Array.isArray(data) ? data : data?.results ?? [];
}

// Se pide ?page=2, 3... con la ruta propia y no con la URL de `next`: detrás del
// proxy de Render puede venir con http://.
export async function todasLasPaginas(ruta) {
  const base = `${ruta}${ruta.includes("?") ? "&" : "?"}page_size=${TAMANO_PAGINA}`;
  const primera = await apiFetch(base, { method: "GET" });
  if (Array.isArray(primera)) return primera;

  const resultados = [...comoLista(primera)];
  let siguiente = primera?.next;
  for (let pagina = 2; siguiente && pagina <= MAX_PAGINAS; pagina += 1) {
    const datos = await apiFetch(`${base}&page=${pagina}`, { method: "GET" });
    resultados.push(...comoLista(datos));
    siguiente = datos?.next;
  }
  return resultados;
}
