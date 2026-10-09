import { apiFetch } from "./client";


export async function getProveedores() {
    try {
        return await apiFetch("/proveedores/", { method: "GET" });
    } catch (error) {
        console.error("Error en getProveedores API:", error);
        throw new Error(
            error.message || "No se pudieron obtener los proveedores del servidor."
        );
    }
}


export async function crearProveedor(proveedorData) {
    if (!proveedorData.nombre || !proveedorData.nombre.trim()) {
        throw new Error("El nombre del proveedor es obligatorio.");
    }
    if (!proveedorData.contacto || !proveedorData.contacto.trim()) {
        throw new Error("El contacto o teléfono del proveedor es obligatorio.");
    }

    return await apiFetch("/proveedores/", {
        method: "POST",
        body: JSON.stringify(proveedorData),
    });
}


export async function eliminarProveedor(id) {
    if (!id) throw new Error("ID de proveedor no válido.");

    return await apiFetch(`/proveedores/${id}/`, {
        method: "DELETE",
    });
}