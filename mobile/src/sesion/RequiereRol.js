import { Redirect } from "expo-router";
import { Cargando } from "../componentes/ui";
import { rolDe, useSesion } from "./Sesion";

// Envuelve una pantalla que exige sesión y un rol. Es solo experiencia de
// usuario: la seguridad real es el 401/403 del backend (igual que en la web).
// `rol` es un rol ("administrador") o una lista de roles (["cliente", "proveedor"]).
export default function RequiereRol({ rol, children }) {
  const { estado, usuario } = useSesion();
  if (estado === "cargando") return <Cargando />;
  if (estado === "sin-sesion") return <Redirect href="/login" />;
  const permitidos = Array.isArray(rol) ? rol : [rol];
  if (!permitidos.includes(rolDe(usuario))) return <Redirect href="/" />;
  return children;
}
