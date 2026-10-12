import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import Login from "./pages/Login";
import Registrar from "./pages/Registrar";
import DashboardLayout from "./pages/DashboardLayout";
import Home from "./pages/Home";
import Cotizaciones from "./pages/Cotizaciones";
import Salones from "./pages/Salones";
import Sitios from "./pages/hoteles/Sitios";
import Clientes from "./pages/Clientes";
import Conceptos from "./pages/Conceptos";
import Proveedores from "./pages/Proveedores";
import Rack from "./pages/Rack";
import { getUsuarioActual, logout } from "./api/auth";
import { rolesDeRuta } from "./rutasPorRol";

// Envuelve TODAS las rutas del dashboard: si no hay usuario logueado,
// redirige a /login en vez de dejar pasar a cualquiera de las pantallas hijas.
function ProtectedRoute({ user, cargando }) {
  if (cargando) {
    return <div style={{ padding: "2rem" }}>Verificando sesión...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

// Redirige a /inicio si el rol del usuario no puede ver la ruta actual, según
// ROLES_POR_RUTA (rutasPorRol.js). Envuelve TODO el panel y niega por defecto:
// una ruta sin roles declarados no la ve nadie.
// REGLA: toda ruta nueva declara sus roles en rutasPorRol.js en el mismo PR.
// Es solo experiencia de usuario: la seguridad real es el 403 del API.
function RoleRoute({ user }) {
  const { pathname } = useLocation();
  if (!rolesDeRuta(pathname).includes(user?.role)) {
    return <Navigate to="/inicio" replace />;
  }
  return <Outlet />;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function restaurarSesion() {
      const token = sessionStorage.getItem("access_token");
      if (token) {
        try {
          const usuario = await getUsuarioActual();
          setUser({
            name: usuario.username,
            role: usuario.rol?.codigo || "cliente",
            sitios: usuario.sitios || [],
          });
        } catch {
          logout();
          setUser(null);
        }
      }
      setCargando(false);
    }
    restaurarSesion();
  }, []);

  async function handleLoginSuccess() {
    const usuario = await getUsuarioActual();
    setUser({
      name: usuario.username,
      role: usuario.rol?.codigo || "cliente",
      sitios: usuario.sitios || [],
    });
  }

  function handleLogout() {
    logout();
    setUser(null);
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/login"
          element={<Login onLoginSuccess={handleLoginSuccess} />}
        />
        <Route path="/registro" element={<Registrar />} />

        {/* Todo lo de aquí adentro exige sesión iniciada */}
        <Route element={<ProtectedRoute user={user} cargando={cargando} />}>
          {/* Y todo lo de aquí adentro comparte el mismo sidebar + navbar */}
          <Route
            element={
              <DashboardLayout
                user={user ?? undefined}
                onLogout={handleLogout}
              />
            }
          >
            {/* Y todo lo de aquí adentro exige un rol permitido para la ruta */}
            <Route element={<RoleRoute user={user} />}>
              <Route path="/inicio" element={<Home />} />
              <Route path="/cotizaciones" element={<Cotizaciones />} />
              <Route path="/salones" element={<Salones />} />
              <Route path="/sitios" element={<Sitios />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/conceptos" element={<Conceptos />} />
              <Route path="/rack" element={<Rack />} />

              {/* Aún pendiente de construir */}
              <Route
                path="/calendario"
                element={
                  <div style={{ padding: "2rem" }}>
                    Calendario — pendiente de construir
                  </div>
                }
              />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
