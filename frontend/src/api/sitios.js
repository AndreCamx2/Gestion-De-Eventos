import { apiFetch } from "./client";

// Solo administrador (EsAdministrador en el backend). DRF puede devolver una
// lista simple o un objeto paginado { count, results }: se aceptan ambas formas.
function comoLista(data) {
  return Array.isArray(data) ? data : data?.results ?? [];
}

// GET /api/sitios/ → [{ id, nombre, ciudad, ciudad_nombre, creado_en }]
// Solo los sitios de quien consulta (SGDE-90); el superusuario ve todos.
export async function listarSitios() {
  return comoLista(await apiFetch("/sitios/", { method: "GET" }));
}

// POST /api/sitios/. `ciudad` es el id de la ciudad, no su nombre ni su código.
export function crearSitio({ nombre, ciudad }) {
  return apiFetch("/sitios/", {
    method: "POST",
    body: JSON.stringify({ nombre, ciudad }),
  });
}

// GET /api/ciudades/ → [{ id, codigo, nombre }]. Catálogo para el select y para
// mostrar el código (CTG) en cada tarjeta.
export async function listarCiudades() {
  return comoLista(await apiFetch("/ciudades/", { method: "GET" }));
}
