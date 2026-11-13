import { apiFetch } from "./client";
import { comoLista, todasLasPaginas } from "./listas";

export async function listarProveedores() {
  return todasLasPaginas("/proveedores/");
}

export function crearProveedor({ nombre, identificacion, contacto }) {
  return apiFetch("/proveedores/", {
    method: "POST",
    body: JSON.stringify({ nombre, identificacion, contacto }),
  });
}

export function vincularUsuarioProveedor(id, usuario) {
  return apiFetch(`/proveedores/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ usuario }),
  });
}

export async function listarStock() {
  return todasLasPaginas("/stock/");
}

export function crearElementoStock({ proveedor, nombre_elemento, cantidad, valor }) {
  return apiFetch("/stock/", {
    method: "POST",
    body: JSON.stringify({ proveedor, nombre_elemento, cantidad, valor }),
  });
}

export function editarStock(id, cambios) {
  return apiFetch(`/stock/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(cambios),
  });
}

export async function listarMiStock() {
  return todasLasPaginas("/mi-stock/");
}

export function crearMiStock({ nombre_elemento, cantidad, valor }) {
  return apiFetch("/mi-stock/", {
    method: "POST",
    body: JSON.stringify({ nombre_elemento, cantidad, valor }),
  });
}

export function editarMiStock(id, cambios) {
  return apiFetch(`/mi-stock/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(cambios),
  });
}

export async function compararStock(elemento = "") {
  const texto = elemento.trim();
  const query = texto ? `?elemento=${encodeURIComponent(texto)}` : "";
  return comoLista(await apiFetch(`/stock/comparar/${query}`, { method: "GET" }));
}
