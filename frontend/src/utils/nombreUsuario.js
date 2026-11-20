export function nombreVisible(usuario) {
  return usuario?.first_name?.trim() || usuario?.username || "";
}
