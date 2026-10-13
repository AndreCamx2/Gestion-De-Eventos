import { apiFetch } from "./client";

// Todo este módulo es solo para administrador (EsAdministrador en el backend).
// Usa apiFetch directo: los errores conservan error.status y error.body, así la
// pantalla distingue un 401 de un 400. DRF puede devolver una lista simple o un
// objeto paginado { count, results }: las listas aceptan ambas formas.
// El API no tiene editar ni borrar, ni de proveedores ni de stock.
function comoLista(data) {
  return Array.isArray(data) ? data : data?.results ?? [];
}

// GET /api/proveedores/ → [{ id, nombre, identificacion, contacto }]
export async function listarProveedores() {
  return comoLista(await apiFetch("/proveedores/", { method: "GET" }));
}

// POST /api/proveedores/. Solo el nombre es obligatorio.
export function crearProveedor({ nombre, identificacion, contacto }) {
  return apiFetch("/proveedores/", {
    method: "POST",
    body: JSON.stringify({ nombre, identificacion, contacto }),
  });
}

// GET /api/stock/ → [{ id, proveedor, nombre_elemento, cantidad, valor, actualizado_en }]
// Trae el stock de TODOS los proveedores: la pantalla lo filtra por proveedor.
export async function listarStock() {
  return comoLista(await apiFetch("/stock/", { method: "GET" }));
}

// POST /api/stock/. Un elemento no se repite en el mismo proveedor.
export function crearElementoStock({ proveedor, nombre_elemento, cantidad, valor }) {
  return apiFetch("/stock/", {
    method: "POST",
    body: JSON.stringify({ proveedor, nombre_elemento, cantidad, valor }),
  });
}
