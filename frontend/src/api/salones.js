import { apiFetch } from "./client";

function buildQueryParams(filters = {}) {
    const params = new URLSearchParams();

    if (filters.busqueda) {
        params.append("search", filters.busqueda.trim());
    }
    if (filters.capacidad && filters.capacidad !== "Cualquiera") {
        params.append("capacidad", filters.capacidad);
    }
    if (filters.montaje && filters.montaje !== "Cualquiera") {
        params.append("montaje", filters.montaje);
    }

    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
}

export async function getSalones(filters = {}) {
    try {
        const query = buildQueryParams(filters);
        const endpoint = `/salones/${query}`;

        return await apiFetch(endpoint, { method: "GET" });
    } catch (error) {
        console.error("Error en getSalones API:", error);
        throw new Error(
            error.message || "No se pudieron obtener los salones del servidor."
        );
    }
}

export async function crearSalon(salonData) {
    if (!salonData.nombre || !salonData.nombre.trim()) {
        throw new Error("El nombre del salón es obligatorio.");
    }
    if (!salonData.capacidad || Number(salonData.capacidad) <= 0) {
        throw new Error("La capacidad del salón debe ser un número mayor a 0.");
    }

    return await apiFetch("/salones/", {
        method: "POST",
        body: JSON.stringify(salonData),
    });
}