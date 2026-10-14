import { useEffect, useState } from "react";
import { getUsuarioActual } from "../../api/auth";
import { obtenerCalendario } from "../../api/calendario";
import { listarCotizaciones } from "../../api/inicio";
import { listarSalones } from "../../api/salones";
import { fechaISO, hoyLocal, sumarDias } from "../../utils/inicioCifras";
import { nombreVisible } from "../../utils/nombreUsuario";
import { DIAS_VENTANA } from "./inicio";

const BLOQUE_INICIAL = { fase: "cargando", datos: [], error: null };

// Tipo de error para AvisoError: "sesion" (401), "permiso" (403) o "servidor".
function tipoDeError(err) {
  if (err?.status === 401) return "sesion";
  if (err?.status === 403) return "permiso";
  return "servidor";
}

// Datos del Inicio (SGDE-103): el usuario y, solo para el administrador, las
// cotizaciones, el calendario de los próximos DIAS_VENTANA días y los salones.
// Cada bloque es { fase: "cargando" | "listo" | "error", datos, error } y falla
// por separado. Devuelve los bloques, las funciones para volver a pedir cada uno
// y alVolverAEntrar, que repite lo que falló por la sesión.
export function useInicio() {
  // La fecha de hoy queda fija mientras la pantalla está abierta.
  const [hoy] = useState(hoyLocal);
  // El usuario se pide aquí: el contexto del Outlet de DashboardLayout no llega
  // a esta pantalla porque RoleRoute (routes/guards.jsx) tiene su propio <Outlet />.
  const [usuario, setUsuario] = useState(BLOQUE_INICIAL);
  const [cotizaciones, setCotizaciones] = useState(BLOQUE_INICIAL);
  const [calendario, setCalendario] = useState(BLOQUE_INICIAL);
  const [salones, setSalones] = useState(BLOQUE_INICIAL);
  const [sesionVencida, setSesionVencida] = useState(false);

  const rol = usuario.datos?.rol?.codigo;
  const nombre = nombreVisible(usuario.datos);
  const esAdmin = rol === "administrador";

  // Pide un bloque y guarda su resultado. Si falla, solo ese bloque muestra el error.
  async function ejecutar(pedir, setBloque) {
    setBloque((prev) => ({ ...prev, fase: "cargando", error: null }));
    try {
      setBloque({ fase: "listo", datos: await pedir(), error: null });
    } catch (err) {
      const tipo = tipoDeError(err);
      if (tipo === "sesion") setSesionVencida(true);
      setBloque({ fase: "error", datos: [], error: tipo });
    }
  }

  const cargarUsuario = () => ejecutar(getUsuarioActual, setUsuario);
  const cargarCotizaciones = () => ejecutar(listarCotizaciones, setCotizaciones);
  const cargarCalendario = () =>
    ejecutar(
      () => obtenerCalendario({ desde: fechaISO(hoy), hasta: fechaISO(sumarDias(hoy, DIAS_VENTANA - 1)) }),
      setCalendario,
    );
  const cargarSalones = () => ejecutar(listarSalones, setSalones);

  useEffect(() => {
    cargarUsuario();
  }, []);

  // Solo el administrador pide cotizaciones y calendario: a cliente y proveedor
  // el API les responde 403.
  useEffect(() => {
    if (!esAdmin) return;
    cargarCotizaciones();
    cargarCalendario();
    cargarSalones();
  }, [esAdmin]);

  function alVolverAEntrar() {
    setSesionVencida(false);
    // Lo que falló por la sesión se pide otra vez.
    if (usuario.error === "sesion") cargarUsuario();
    if (cotizaciones.error === "sesion") cargarCotizaciones();
    if (calendario.error === "sesion") cargarCalendario();
    if (salones.error === "sesion") cargarSalones();
  }

  return {
    hoy,
    usuario,
    cotizaciones,
    calendario,
    salones,
    sesionVencida,
    rol,
    nombre,
    esAdmin,
    cargarUsuario,
    cargarCotizaciones,
    cargarCalendario,
    cargarSalones,
    alVolverAEntrar,
  };
}
