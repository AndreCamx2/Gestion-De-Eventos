// Qué roles pueden ver cada ruta del panel (SGDE-54). Única fuente de verdad:
// la usan RoleRoute (routes/guards.jsx) para dejar entrar o redirigir, y NAV_ITEMS
// (DashboardLayout.jsx) para no mostrar enlaces prohibidos.
//
// Es solo experiencia de usuario: la seguridad real es el 403 del backend.
// Por eso cada ruta tiene los mismos roles que exige el API que llama su pantalla
// (los endpoints de datos piden EsAdministrador, salvo /mi-stock/: EsProveedor).
//
// REGLA: toda ruta nueva del panel se agrega aquí, con sus roles, en el mismo PR.
// Una ruta que no esté en esta lista se niega a todos (redirige a /inicio).

const TODOS = ["administrador", "cliente", "proveedor"];
const SOLO_ADMIN = ["administrador"];

export const ROLES_POR_RUTA = {
  // A /inicio redirige RoleRoute: debe aceptar a todos o se forma un ciclo.
  "/inicio": TODOS,
  "/cotizaciones": SOLO_ADMIN, // GET /cotizaciones/
  "/calendario": SOLO_ADMIN, // /calendario/, /salones/ y /cotizaciones/<id>/bloqueo/
  "/salones": SOLO_ADMIN, // GET /salones/
  "/sitios": SOLO_ADMIN, // /sitios/ (y /ciudades/)
  "/clientes": SOLO_ADMIN, // /clientes/, /empresas/
  "/conceptos": SOLO_ADMIN, // /conceptos/, /sitios/
  "/proveedores": SOLO_ADMIN, // /proveedores/, /stock/
  "/rack": SOLO_ADMIN, // /calendario/, /salones/ y /cotizaciones/<id>/bloqueo/
  "/usuarios": SOLO_ADMIN, // /usuarios/, /roles/, /sitios/
  "/mis-cotizaciones": ["cliente"], // /mis-cotizaciones/ (SGDE-126)
  "/mi-stock": ["proveedor"], // /mi-stock/ (SGDE-72)
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
