import { apiFetch } from "./client";

/**
 * @param {Object} filters
 * @returns {string}
 * @returns {Promise<Array|Object>} 
 * @param {Object} filters
 * @param {Object} filters
 * @returns {Promise<Array|Object>} 
 */

function buildQueryParams(filters = {}) {
    const params = new URLSearchParams();

    if (filters.estado && filters.estado !== "Todos") {
        params.append("estado", filters.estado.toLowerCase());
    }

    if (filters.tipo && filters.tipo !== "Todos") {
        const tipoMap = {
            Persona: "natural",
            Empresa: "juridica",
        };
        if (tipoMap[filters.tipo]) {
            params.append("tipo_cliente", tipoMap[filters.tipo]);
        }
    }

    if (filters.rangoFecha && filters.rangoFecha !== "Todos") {
        params.append("rango", filters.rangoFecha);
    }

    if (filters.page && Number.isInteger(Number(filters.page)) && Number(filters.page) > 0) {
        params.append("page", filters.page);
    }

    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
}

export async function getCotizaciones(filters = {}) {
    try {
        const query = buildQueryParams(filters);
        const endpoint = `/cotizaciones/${query}`;

        return await apiFetch(endpoint, { method: "GET" });
    } catch (error) {
        console.error("Error en getCotizaciones API:", error);
        throw new Error(
            error.message || "No se pudieron obtener las cotizaciones del servidor."
        );
    }
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