import { apiFetch } from "./client";
import { todasLasPaginas } from "./listas";

export async function getCotizaciones({ desde, hasta, estado, cliente, salon } = {}) {
    const params = new URLSearchParams();
    if (desde) params.append("desde", desde);
    if (hasta) params.append("hasta", hasta);
    if (estado) params.append("estado", estado);
    if (cliente) params.append("cliente", cliente);
    if (salon) params.append("salon", salon);
    const query = params.toString();
    return todasLasPaginas(`/cotizaciones/${query ? `?${query}` : ""}`);
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

export function registrarAceptacion(id, { tipo, monto }) {
    return apiFetch(`/cotizaciones/${id}/aceptacion/`, {
        method: "POST",
        body: JSON.stringify({ tipo, monto }),
    });
}

// Cancela un evento confirmado (SGDE-68). El API recibe el porcentaje (0 a 100) y
// calcula el monto retenido; responde el detalle ya cancelado o 409 si no estaba confirmado.
export function cancelarCotizacion(id, { penalizacionPct, motivo }) {
    return apiFetch(`/cotizaciones/${id}/cancelacion/`, {
        method: "POST",
        body: JSON.stringify({ penalizacion_pct: penalizacionPct, motivo }),
    });
}

export function getMovimientos(id) {
    return todasLasPaginas(`/cotizaciones/${id}/movimientos/`);
}
