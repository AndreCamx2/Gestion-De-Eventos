import { apiFetch } from "./client";

export async function getCotizaciones({ desde, hasta } = {}) {
    const params = new URLSearchParams();
    if (desde) params.append("desde", desde);
    if (hasta) params.append("hasta", hasta);
    const query = params.toString();
    return apiFetch(`/cotizaciones/${query ? `?${query}` : ""}`, { method: "GET" });
}

export async function crearCotizacion(cotizacionData) {
    if (!cotizacionData.salon_id) {
        throw new Error("Debes seleccionar un salón válido.");
    }
    if (!cotizacionData.montaje_id) {
        throw new Error("Debes seleccionar un tipo de montaje.");
    }
    if (!cotizacionData.asistentes || Number(cotizacionData.asistentes) <= 0) {
        throw new Error("La cantidad de asistentes debe ser mayor a 0.");
    }
    if (!cotizacionData.fecha_evento) {
        throw new Error("La fecha del evento es obligatoria.");
    }

    return await apiFetch("/cotizaciones/", {
        method: "POST",
        body: JSON.stringify(cotizacionData),
    });
}
