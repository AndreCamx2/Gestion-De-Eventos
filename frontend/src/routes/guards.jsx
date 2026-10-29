import { Navigate, Outlet, useLocation } from "react-router-dom";
import { rolesDeRuta } from "./rutasPorRol";

// Mientras se revisa si hay sesión (al cargar o recargar la página) no se
// redirige a ningún lado: así no se manda al login a alguien que sí tiene sesión.
function VerificandoSesion() {
  return <div style={{ padding: "2rem" }}>Verificando sesión...</div>;
}

// Envuelve TODAS las rutas del dashboard: si no hay usuario logueado,
// redirige a /login en vez de dejar pasar a cualquiera de las pantallas hijas.
export function ProtectedRoute({ user, cargando }) {
  if (cargando) {
    return <VerificandoSesion />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

// Para "/" y para cualquier ruta que no existe (SGDE-94): con sesión va a
// /inicio (igual que RoleRoute con una ruta prohibida); sin sesión, a /login.
export function SegunSesion({ user, cargando }) {
  if (cargando) {
    return <VerificandoSesion />;
  }
  return <Navigate to={user ? "/inicio" : "/login"} replace />;
}

// Para /login y /registro (SGDE-94): con la sesión ya iniciada no tiene sentido
// mostrarlos, se va directo a /inicio.
export function SoloSinSesion({ user, cargando, children }) {
  if (cargando) {
    return <VerificandoSesion />;
  }
  if (user) {
    return <Navigate to="/inicio" replace />;
  }
  return children;
}

// Redirige a /inicio si el rol del usuario no puede ver la ruta actual, según
// ROLES_POR_RUTA (rutasPorRol.js). Envuelve TODO el panel y niega por defecto:
// una ruta sin roles declarados no la ve nadie.
// REGLA: toda ruta nueva declara sus roles en rutasPorRol.js en el mismo PR.
// Es solo experiencia de usuario: la seguridad real es el 403 del API.
export function RoleRoute({ user }) {
  const { pathname } = useLocation();
  if (!rolesDeRuta(pathname).includes(user?.role)) {
    return <Navigate to="/inicio" replace />;
  }
  return <Outlet />;
}
