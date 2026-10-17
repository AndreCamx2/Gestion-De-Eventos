import { apiFetch } from "./client";

// Listas del API (SGDE-116). Cotizaciones, clientes, usuarios y stock responden
// paginados: { count, next, previous, results }. Los demás endpoints devuelven
// una lista simple. Estas funciones aceptan las dos formas.

// Filas por página que se piden: el máximo del backend (PaginaEstandar). Va en
// todas las páginas, para que ?page=2 empiece donde terminó la 1. Los endpoints
// sin paginación ignoran el parámetro.
export const TAMANO_PAGINA = 200;

// Tope de páginas por lista: si el API respondiera siempre con `next`, la carga
// se corta aquí en vez de quedarse pidiendo páginas sin fin.
export const MAX_PAGINAS = 100;

// Una sola respuesta → lista. Con paginación, solo trae la página recibida.
export function comoLista(data) {
  return Array.isArray(data) ? data : data?.results ?? [];
}

// GET de una lista completa: si viene paginada, pide ?page=2, 3... hasta que
// `next` llegue en null y une los resultados. Se usa en las pantallas que
// necesitan todos los registros (tablas, cifras, selectores). Las páginas se
// piden con la ruta propia y no con la URL de `next`, que el backend arma con su
// propio host y esquema (detrás del proxy de Render puede venir con http://).
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
