import { apiFetch } from "./client";

export async function getCotizaciones({ desde, hasta } = {}) {
    const params = new URLSearchParams();
    if (desde) params.append("desde", desde);
    if (hasta) params.append("hasta", hasta);
    const query = params.toString();
    return apiFetch(`/cotizaciones/${query ? `?${query}` : ""}`, { method: "GET" });
}

// POST /api/cotizaciones/<id>/bloqueo/ { bloqueo_hasta: ISO con zona } → detalle (SGDE-40).
// 409 { detail }: no está cotizada, está vencida, el salón está dado de baja, o la
// fecha ya está confirmada o bloqueada por otra. 400 { bloqueo_hasta: [...] }:
// en el pasado o después del día del evento.
export function bloquearCotizacion(id, bloqueoHasta) {
    return apiFetch(`/cotizaciones/${id}/bloqueo/`, {
        method: "POST",
        body: JSON.stringify({ bloqueo_hasta: bloqueoHasta }),
    });
}

// DELETE /api/cotizaciones/<id>/bloqueo/ → detalle, de vuelta en "cotizado".
// 409 si no está bloqueada.
export function liberarBloqueo(id) {
    return apiFetch(`/cotizaciones/${id}/bloqueo/`, { method: "DELETE" });
}

export function crearCotizacion(datos) {
    return apiFetch("/cotizaciones/", {
        method: "POST",
        body: JSON.stringify(datos),
    });
}

export function getCotizacion(id) {
    return apiFetch(`/cotizaciones/${id}/`, { method: "GET" });
}

export function extenderVigencia(id, validezOferta) {
    return apiFetch(`/cotizaciones/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ validez_oferta: validezOferta }),
    });
}
