import { api } from "./cliente";
import { todasLasPaginas } from "./listas";

export function listarMiStock() {
  return todasLasPaginas("/mi-stock/");
}

export function obtenerElemento(id) {
  return api(`/mi-stock/${id}/`);
}

export function crearElemento({ nombreElemento, cantidad, valor }) {
  return api("/mi-stock/", {
    method: "POST",
    body: JSON.stringify({ nombre_elemento: nombreElemento.trim(), cantidad, valor }),
  });
}

export function actualizarElemento(id, { cantidad, valor }) {
  return api(`/mi-stock/${id}/`, { method: "PATCH", body: JSON.stringify({ cantidad, valor }) });
}
