import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Registrar from "./pages/Registrar";
import DashboardLayout from "./layouts/DashboardLayout";
import Home from "./pages/Home";
import Cotizaciones from "./pages/Cotizaciones";
import Salones from "./pages/Salones";
import Sitios from "./pages/Sitios";
import Clientes from "./pages/Clientes";
import Conceptos from "./pages/Conceptos";
import Proveedores from "./pages/Proveedores";
import Rack from "./pages/Rack";
import { getUsuarioActual, logout } from "./api/auth";
import {
  ProtectedRoute,
  RoleRoute,
  SegunSesion,
  SoloSinSesion,
} from "./routes/guards";
import { nombreVisible } from "./utils/nombreUsuario";

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
            name: nombreVisible(usuario),
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
      name: nombreVisible(usuario),
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
        <Route path="/" element={<SegunSesion user={user} cargando={cargando} />} />

        <Route
          path="/login"
          element={
            <SoloSinSesion user={user} cargando={cargando}>
              <Login onLoginSuccess={handleLoginSuccess} />
            </SoloSinSesion>
          }
        />
        <Route
          path="/registro"
          element={
            <SoloSinSesion user={user} cargando={cargando}>
              <Registrar />
            </SoloSinSesion>
          }
        />

        {/* Todo lo de aquí adentro exige sesión iniciada */}
        <Route element={<ProtectedRoute user={user} cargando={cargando} />}>
          {/* Y todo lo de aquí adentro comparte la misma barra superior */}
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
              <Route path="/proveedores" element={<Proveedores />} />
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

        {/* Ruta que no existe: /inicio con sesión, /login sin sesión */}
        <Route path="*" element={<SegunSesion user={user} cargando={cargando} />} />
      </Routes>
    </BrowserRouter>
  );
}
