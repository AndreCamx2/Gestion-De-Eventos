// Auxiliares de la pantalla de Clientes (SGDE-97). Viven en un .js porque un
// .jsx solo exporta componentes (react-refresh, SGDE-55).

export const FILTROS_TIPO = [
  { value: "todos", label: "Todos" },
  { value: "natural", label: "Natural" },
  { value: "juridica", label: "Jurídica" },
];

export function iniciales(nombre) {
  const letras = String(nombre ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");
  return letras || "?";
}

// Minúsculas y sin tildes: así "perez" encuentra a "Pérez".
export function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function hayDiferencias(a, b) {
  return Object.keys(a).some((campo) => a[campo] !== b[campo]);
}
