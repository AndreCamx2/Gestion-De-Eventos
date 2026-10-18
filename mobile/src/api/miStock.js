import { api } from "./cliente";
import { todasLasPaginas } from "./listas";

// "Mi stock" (rol proveedor, SGDE-30): solo el stock de SU proveedor; el backend
// pone el proveedor. 403 {detail, codigo}: "no_es_proveedor" o "proveedor_sin_vincular".

// GET /api/mi-stock/ → [{id, proveedor, nombre_elemento, cantidad, valor, actualizado_en}]
export function listarMiStock() {
  return todasLasPaginas("/mi-stock/");
}

export function obtenerElemento(id) {
  return api(`/mi-stock/${id}/`);
}

// POST /api/mi-stock/ {nombre_elemento, cantidad, valor}. 400 si ya tiene un
// elemento con ese nombre ("edítalo") o si cantidad o valor son negativos.
export function crearElemento({ nombreElemento, cantidad, valor }) {
  return api("/mi-stock/", {
    method: "POST",
    body: JSON.stringify({ nombre_elemento: nombreElemento.trim(), cantidad, valor }),
  });
}

// PATCH /api/mi-stock/<id>/ {cantidad, valor}. El nombre no se cambia (SGDE-98).
export function actualizarElemento(id, { cantidad, valor }) {
  return api(`/mi-stock/${id}/`, { method: "PATCH", body: JSON.stringify({ cantidad, valor }) });
}
