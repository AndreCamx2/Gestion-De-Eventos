import { api } from "./cliente";

// Igual que frontend/src/api/listas.js (SGDE-116): acepta listas simples y
// paginadas ({count, next, previous, results}) y trae todas las páginas.

export const TAMANO_PAGINA = 200;
export const MAX_PAGINAS = 100;

export function comoLista(datos) {
  return Array.isArray(datos) ? datos : datos?.results ?? [];
}

// Pide ?page=2, 3... con la ruta propia (no con la URL de `next`, que detrás del
// proxy de Render puede venir con http://) hasta que `next` llega en null.
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
