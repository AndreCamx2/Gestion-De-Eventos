import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Registrar from "./components/Registrar";
import Home from "./components/Home";

// Envuelve cualquier ruta que solo deba verse si el usuario inició sesión.
// Si no hay usuario, lo manda de vuelta al login en vez de mostrar la pantalla.
function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);

  function handleLoginSuccess({ email }) {
    // Mientras no conectemos el backend, guardamos solo lo básico.
    // Cuando conectemos la API real, aquí debería guardar también el rol
    // que devuelva el servidor (administrador / cliente / proveedor).
    setUser({ name: email.split("@")[0], role: "cliente" });
  }

  function handleLogout() {
    setUser(null);
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/registro" element={<Registrar />} />

        <Route
          path="/inicio"
          element={
            <ProtectedRoute user={user}>
              <Home user={user ?? undefined} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* Estas rutas ya están enlazadas desde el sidebar y las quick-access
            cards de Home; crear sus componentes y reemplazar este placeholder
            a medida que las vayamos construyendo. */}
        <Route
          path="/cotizaciones"
          element={
            <ProtectedRoute user={user}>
              <div style={{ padding: "2rem" }}>Cotizaciones — pendiente de construir</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendario"
          element={
            <ProtectedRoute user={user}>
              <div style={{ padding: "2rem" }}>Calendario — pendiente de construir</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clientes"
          element={
            <ProtectedRoute user={user}>
              <div style={{ padding: "2rem" }}>Clientes — pendiente de construir</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/salones"
          element={
            <ProtectedRoute user={user}>
              <div style={{ padding: "2rem" }}>Salones y Servicios — pendiente de construir</div>
            </ProtectedRoute>
          }
        />

        {/* Cualquier ruta desconocida vuelve al login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
