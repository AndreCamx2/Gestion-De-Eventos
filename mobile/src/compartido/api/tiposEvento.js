import { apiFetch } from "./client";

export function listarTiposEvento() {
  return apiFetch("/tipos-evento/", { method: "GET" });
}
