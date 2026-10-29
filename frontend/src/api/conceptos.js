import { apiFetch } from "./client";
import { todasLasPaginas } from "./listas";



export async function listarConceptos() {
    return todasLasPaginas("/conceptos/");
}

export async function crearConcepto(datos) {
    return apiFetch("/conceptos/", {
        method: "POST",
        body: JSON.stringify(datos),
    });
}


export async function actualizarConcepto(id, datos) {
    return apiFetch(`/conceptos/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(datos),
    });
}


export async function cambiarEstadoConcepto(id, activo) {
    return actualizarConcepto(id, { activo });
}


export async function historialConcepto(id) {
    return todasLasPaginas(`/conceptos/${id}/historial/`);
}

export async function listarSitios() {
    return todasLasPaginas("/sitios/");
}