    import { apiFetch } from "./client";

    export async function getRackDisponibilidad(params = {}) {
        try {
            const query = new URLSearchParams();
            if (params.fechaInicio) query.append("fecha_inicio", params.fechaInicio);
            if (params.fechaFin) query.append("fecha_fin", params.fechaFin);
            if (params.salonId && params.salonId !== "Todos") {
                query.append("salon_id", params.salonId);
            }

            const queryString = query.toString();
            const endpoint = queryString ? `/rack/?${queryString}` : "/rack/";

            return await apiFetch(endpoint, { method: "GET" });
        } catch (error) {
            console.error("Error en getRackDisponibilidad API:", error);
            throw new Error(
                error.message || "No se pudo obtener la disponibilidad del rack desde el servidor."
            );
        }
    }

    export async function crearBloqueoTemporal(bloqueoData) {
        if (!bloqueoData.salon_id) {
            throw new Error("Debes seleccionar un salón válido.");
        }
        if (!bloqueoData.fecha_evento) {
            throw new Error("La fecha del evento es obligatoria.");
        }

        return await apiFetch("/rack/bloqueos/", {
            method: "POST",
            body: JSON.stringify(bloqueoData),
        });
    }