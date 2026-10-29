import { apiFetch } from "./client";

// GET /api/tipos-evento/ → [{ id, nombre, tipos: [{ id, nombre }] }]
export function listarTiposEvento() {
  return apiFetch("/tipos-evento/", { method: "GET" });
}
