import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cerrarSesion, haySesionGuardada, iniciarSesion, usuarioActual } from "../api/auth";
import { alVencer } from "../api/cliente";

// Estado de la sesión para toda la app.
// estado: "cargando" (revisando si había sesión) | "sin-sesion" | "con-sesion"
// usuario: lo que devuelve /api/usuarios/me/ (con rol.codigo y proveedor).
const ContextoSesion = createContext(null);

// Roles que tienen módulo en la app móvil.
export const RUTA_POR_ROL = {
  administrador: "/disponibilidad",
  proveedor: "/mi-stock",
};

export function ProveedorSesion({ children }) {
  const [estado, setEstado] = useState("cargando");
  const [usuario, setUsuario] = useState(null);

  const salir = useCallback(async () => {
    await cerrarSesion();
    setUsuario(null);
    setEstado("sin-sesion");
  }, []);

  // Al abrir la app: si hay un refresh guardado, se pide el usuario (si el access
  // venció, el cliente lo renueva solo). Si falla, se vuelve al login.
  useEffect(() => {
    let vigente = true;
    alVencer(() => {
      setUsuario(null);
      setEstado("sin-sesion");
    });
    (async () => {
      try {
        if (!(await haySesionGuardada())) throw new Error("sin sesión");
        const yo = await usuarioActual();
        if (vigente) {
          setUsuario(yo);
          setEstado("con-sesion");
        }
      } catch {
        if (vigente) setEstado("sin-sesion");
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const entrar = useCallback(async (nombre, clave) => {
    await iniciarSesion(nombre, clave);
    const yo = await usuarioActual();
    setUsuario(yo);
    setEstado("con-sesion");
    return yo;
  }, []);

  const valor = useMemo(() => ({ estado, usuario, entrar, salir }), [estado, usuario, entrar, salir]);
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion() {
  const contexto = useContext(ContextoSesion);
  if (!contexto) throw new Error("useSesion se usa dentro de <ProveedorSesion>");
  return contexto;
}

export function rolDe(usuario) {
  return usuario?.rol?.codigo ?? null;
}
