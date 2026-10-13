import { apiFetch } from "./client";

// Todo este módulo es solo para administrador (EsAdministrador en el backend).
// Usa apiFetch directo: los errores conservan error.status y error.body, así la
// pantalla distingue un 401 de un 400. DRF puede devolver una lista simple o un
// objeto paginado { count, results }: las listas aceptan ambas formas.
// Del stock se editan la cantidad y el valor (SGDE-98). No hay borrar, ni de
// proveedores ni de stock: un elemento agotado queda con cantidad 0.
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

// PATCH /api/stock/<id>/ con solo lo que cambió: { cantidad?, valor? }.
// Devuelve el elemento completo, con actualizado_en nuevo.
export function editarStock(id, cambios) {
  return apiFetch(`/stock/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(cambios),
  });
}

// GET /api/stock/comparar/?elemento=<texto> (SGDE-31): el stock agrupado por
// elemento, sin distinguir mayúsculas, tildes ni espacios de más. Sin texto, todos.
// → [{ elemento, mejor_precio, ofertas: [{ stock_id, proveedor_id, proveedor,
//      contacto, cantidad, valor, actualizado_en, es_mejor_precio }] }]
// Las ofertas llegan ordenadas: disponibles de la más barata a la más cara y las
// agotadas al final. mejor_precio es null si todas están agotadas.
export async function compararStock(elemento = "") {
  const texto = elemento.trim();
  const query = texto ? `?elemento=${encodeURIComponent(texto)}` : "";
  return comoLista(await apiFetch(`/stock/comparar/${query}`, { method: "GET" }));
}
