import { useState } from "react";
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
import Clientes from "./pages/Clientes";
import Rack from "./pages/Rack";
<Route path="/rack" element={<Rack />} />;
import { getUsuarioActual, logout } from "./api/auth";

// Envuelve TODAS las rutas del dashboard: si no hay usuario logueado,
// redirige a /login en vez de dejar pasar a cualquiera de las pantallas hijas.
function ProtectedRoute({ user }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export default function App() {
  const [user, setUser] = useState(null);

  async function handleLoginSuccess() {
    const usuario = await getUsuarioActual();
    setUser({
      name: usuario.username,
      role: usuario.rol.codigo,
      sitios: usuario.sitios,
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
        <Route element={<ProtectedRoute user={user} />}>
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
            {/* TODO: falta crear pages/Salones.jsx (SGDE-35) */}
            <Route
              path="/salones"
              element={
                <div style={{ padding: "2rem" }}>
                  Salones — pendiente de construir
                </div>
              }
            />
            <Route path="/clientes" element={<Clientes />} />

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
