import { apiFetch } from "./client";



export async function listarConceptos() {
    return apiFetch("/conceptos/", { method: "GET" });
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
    return apiFetch(`/conceptos/${id}/historial/`, { method: "GET" });
}

export async function listarSitios() {
    return apiFetch("/sitios/", { method: "GET" });
}