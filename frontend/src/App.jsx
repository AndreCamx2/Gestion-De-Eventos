import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
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

// Redirige a /inicio si el rol del usuario no está permitido. Es solo
// experiencia de usuario: la seguridad real es el 403 del API.
function RoleRoute({ user, roles }) {
  if (!roles.includes(user?.role)) {
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
            <Route path="/inicio" element={<Home />} />
            <Route path="/cotizaciones" element={<Cotizaciones />} />
            <Route path="/salones" element={<Salones />} />
            <Route path="/sitios" element={<Sitios />} />
            <Route element={<RoleRoute user={user} roles={["administrador"]} />}>
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/conceptos" element={<Conceptos />} />
            </Route>
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

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
