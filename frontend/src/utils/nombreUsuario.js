// Nombre que se muestra de un usuario de /usuarios/me/ (saludo del Inicio y
// avatar del encabezado): first_name; si viene vacío, el username.
export function nombreVisible(usuario) {
  return usuario?.first_name?.trim() || usuario?.username || "";
}
