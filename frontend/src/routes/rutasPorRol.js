// Una ruta que no esté aquí se niega a todos. La seguridad real es el 403 del backend.

const TODOS = ["administrador", "cliente", "proveedor"];
const SOLO_ADMIN = ["administrador"];

export const ROLES_POR_RUTA = {
  // A /inicio redirige RoleRoute: debe aceptar a todos o se forma un ciclo.
  "/inicio": TODOS,
  "/cotizaciones": SOLO_ADMIN,
  "/calendario": SOLO_ADMIN,
  "/salones": SOLO_ADMIN,
  "/sitios": SOLO_ADMIN,
  "/clientes": SOLO_ADMIN,
  "/conceptos": SOLO_ADMIN,
  "/proveedores": SOLO_ADMIN,
  "/rack": SOLO_ADMIN,
  "/usuarios": SOLO_ADMIN,
  "/mis-cotizaciones": ["cliente"],
  "/mi-stock": ["proveedor"],
  "/mi-perfil": ["cliente", "proveedor"],
};

// Roles de la ruta que se está viendo. Acepta subrutas por tramos completos:
// "/cotizaciones/12" usa los roles de "/cotizaciones", pero "/cotizaciones-viejas"
// no coincide con "/cotizaciones". Si no hay coincidencia, devuelve [] (nadie entra).
export function rolesDeRuta(pathname) {
  const ruta = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const base = Object.keys(ROLES_POR_RUTA)
    .filter((clave) => ruta === clave || ruta.startsWith(`${clave}/`))
    .sort((a, b) => b.length - a.length)[0];
  return base ? ROLES_POR_RUTA[base] : [];
}
