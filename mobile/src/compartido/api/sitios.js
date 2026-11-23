import { apiFetch } from "./client";
import { todasLasPaginas } from "./listas";

export async function listarSitios() {
  return todasLasPaginas("/sitios/");
}

export function crearSitio({ nombre, ciudad }) {
  return apiFetch("/sitios/", {
    method: "POST",
    body: JSON.stringify({ nombre, ciudad }),
  });
}

export async function listarCiudades() {
  return todasLasPaginas("/ciudades/");
}
