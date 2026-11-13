import { apiFetch } from "./client";
import { todasLasPaginas } from "./listas";

export async function getCotizaciones({
    desde, hasta, estado, cliente, salon, tipo_evento: tipoEvento, grupo_evento: grupoEvento,
} = {}) {
    const params = new URLSearchParams();
    if (desde) params.append("desde", desde);
    if (hasta) params.append("hasta", hasta);
    if (estado) params.append("estado", estado);
    if (cliente) params.append("cliente", cliente);
    if (salon) params.append("salon", salon);
    if (tipoEvento) params.append("tipo_evento", tipoEvento);
    if (grupoEvento) params.append("grupo_evento", grupoEvento);
    const query = params.toString();
    return todasLasPaginas(`/cotizaciones/${query ? `?${query}` : ""}`);
}

export function bloquearCotizacion(id, bloqueoHasta) {
    return apiFetch(`/cotizaciones/${id}/bloqueo/`, {
        method: "POST",
        body: JSON.stringify({ bloqueo_hasta: bloqueoHasta }),
    });
}

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

export function cancelarCotizacion(id, { penalizacionPct, motivo }) {
    return apiFetch(`/cotizaciones/${id}/cancelacion/`, {
        method: "POST",
        body: JSON.stringify({ penalizacion_pct: penalizacionPct, motivo }),
    });
}

export function anularCotizacion(id, motivo) {
    return apiFetch(`/cotizaciones/${id}/anulacion/`, {
        method: "POST",
        body: JSON.stringify({ motivo }),
    });
}

export function editarCotizacion(id, datos) {
    return apiFetch(`/cotizaciones/${id}/edicion/`, {
        method: "PUT",
        body: JSON.stringify(datos),
    });
}

export function getMovimientos(id) {
    return todasLasPaginas(`/cotizaciones/${id}/movimientos/`);
}
