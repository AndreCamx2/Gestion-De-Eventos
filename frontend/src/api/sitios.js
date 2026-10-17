import { apiFetch } from "./client";
import { todasLasPaginas } from "./listas";

// Solo administrador (EsAdministrador en el backend).

// GET /api/sitios/ → [{ id, nombre, ciudad, ciudad_nombre, creado_en }]
// Solo los sitios de quien consulta (SGDE-90); el superusuario ve todos.
export async function listarSitios() {
  return todasLasPaginas("/sitios/");
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
  return todasLasPaginas("/ciudades/");
}
