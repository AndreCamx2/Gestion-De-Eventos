import { apiFetch } from "./client";

// GET /api/sitios/ (requiere login: apiFetch ya manda el token JWT).
// DRF puede devolver una lista simple o un objeto paginado { count, results },
// así que aceptamos ambas formas.
export async function listarSitios() {
  const data = await apiFetch("/sitios/", { method: "GET" });
  return Array.isArray(data) ? data : data?.results ?? [];
}

// POST /api/sitios/
export function crearSitio({ nombre, ciudad }) {
  return apiFetch("/sitios/", {
    method: "POST",
    body: JSON.stringify({ nombre, ciudad }),
  });
}

// GET /api/ciudades/ -> [{ id, nombre, ... }]
// Se usa para llenar el select del formulario: el POST de sitios espera el
// id (clave primaria) de la ciudad, no su nombre ni su código.
// Si el endpoint se llama distinto en el backend, cambia solo la ruta de aquí.



export async function listarCiudades() {
  const data = await apiFetch("/ciudades/", { method: "GET" });
  return Array.isArray(data) ? data : data?.results ?? [];
}

//export async function listarCiudades() {
  // TEMPORAL: mientras el backend no exponga /api/ciudades/
  //return [{ id: 1, nombre: "Cartagena" }]; // reemplaza 1 por el id real
//}