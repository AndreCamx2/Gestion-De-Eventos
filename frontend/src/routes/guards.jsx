import { Navigate, Outlet, useLocation } from "react-router-dom";
import { rolesDeRuta } from "./rutasPorRol";

// Mientras se revisa si hay sesión (al cargar o recargar la página) no se
// redirige a ningún lado: así no se manda al login a alguien que sí tiene sesión.
function VerificandoSesion() {
  return <div style={{ padding: "2rem" }}>Verificando sesión...</div>;
}

export function ProtectedRoute({ user, cargando }) {
  if (cargando) {
    return <VerificandoSesion />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export function SegunSesion({ user, cargando }) {
  if (cargando) {
    return <VerificandoSesion />;
  }
  return <Navigate to={user ? "/inicio" : "/login"} replace />;
}

export function SoloSinSesion({ user, cargando, children }) {
  if (cargando) {
    return <VerificandoSesion />;
  }
  if (user) {
    return <Navigate to="/inicio" replace />;
  }
  return children;
}

// Toda ruta nueva declara sus roles en rutasPorRol.js. La seguridad real es el 403 del API.
export function RoleRoute({ user }) {
  const { pathname } = useLocation();
  if (!rolesDeRuta(pathname).includes(user?.role)) {
    return <Navigate to="/inicio" replace />;
  }
  return <Outlet />;
}
