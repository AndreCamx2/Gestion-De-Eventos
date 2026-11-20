import { useCallback, useEffect, useState } from "react";
import { getUsuarioActual } from "../../api/auth";
import { obtenerCalendario } from "../../api/calendario";
import { listarCotizaciones } from "../../api/inicio";
import { listarMiStock } from "../../api/proveedores";
import { listarSalones } from "../../api/salones";
import { fechaISO, hoyLocal, sumarDias } from "../../utils/inicioCifras";
import { nombreVisible } from "../../utils/nombreUsuario";
import { DIAS_VENTANA } from "./inicio";

const BLOQUE_INICIAL = { fase: "cargando", datos: [], error: null };

function tipoDeError(err) {
  if (err?.status === 401) return "sesion";
  if (err?.status === 403) return err.body?.codigo === "proveedor_sin_vincular" ? "sinVincular" : "permiso";
  return "servidor";
}

async function ejecutar(pedir, setBloque, setSesionVencida) {
  setBloque((prev) => ({ ...prev, fase: "cargando", error: null }));
  try {
    setBloque({ fase: "listo", datos: await pedir(), error: null });
  } catch (err) {
    const tipo = tipoDeError(err);
    if (tipo === "sesion") setSesionVencida(true);
    setBloque({ fase: "error", datos: [], error: tipo });
  }
}

export function useInicio() {
  const [hoy] = useState(hoyLocal);
  // El usuario se pide aquí: el contexto del Outlet de DashboardLayout no llega
  // a esta pantalla porque RoleRoute (routes/guards.jsx) tiene su propio <Outlet />.
  const [usuario, setUsuario] = useState(BLOQUE_INICIAL);
  const [cotizaciones, setCotizaciones] = useState(BLOQUE_INICIAL);
  const [calendario, setCalendario] = useState(BLOQUE_INICIAL);
  const [salones, setSalones] = useState(BLOQUE_INICIAL);
  const [stock, setStock] = useState(BLOQUE_INICIAL);
  const [sesionVencida, setSesionVencida] = useState(false);

  const rol = usuario.datos?.rol?.codigo;
  const nombre = nombreVisible(usuario.datos);
  const esAdmin = rol === "administrador";
  const esProveedor = rol === "proveedor";

  const cargarUsuario = useCallback(() => ejecutar(getUsuarioActual, setUsuario, setSesionVencida), []);
  const cargarCotizaciones = useCallback(
    () => ejecutar(listarCotizaciones, setCotizaciones, setSesionVencida),
    [],
  );
  const cargarCalendario = useCallback(
    () =>
      ejecutar(
        () => obtenerCalendario({ desde: fechaISO(hoy), hasta: fechaISO(sumarDias(hoy, DIAS_VENTANA - 1)) }),
        setCalendario,
        setSesionVencida,
      ),
    [hoy],
  );
  const cargarSalones = useCallback(() => ejecutar(listarSalones, setSalones, setSesionVencida), []);
  const cargarStock = useCallback(() => ejecutar(listarMiStock, setStock, setSesionVencida), []);

  useEffect(() => {
    cargarUsuario();
  }, [cargarUsuario]);

  // Solo el administrador pide cotizaciones y calendario: a cliente y proveedor
  // el API les responde 403.
  useEffect(() => {
    if (!esAdmin) return;
    cargarCotizaciones();
    cargarCalendario();
    cargarSalones();
  }, [esAdmin, cargarCotizaciones, cargarCalendario, cargarSalones]);

  useEffect(() => {
    if (!esProveedor) return;
    cargarStock();
  }, [esProveedor, cargarStock]);

  function alVolverAEntrar() {
    setSesionVencida(false);
    if (usuario.error === "sesion") cargarUsuario();
    if (cotizaciones.error === "sesion") cargarCotizaciones();
    if (calendario.error === "sesion") cargarCalendario();
    if (salones.error === "sesion") cargarSalones();
    if (stock.error === "sesion") cargarStock();
  }

  return {
    hoy,
    usuario,
    cotizaciones,
    calendario,
    salones,
    stock,
    sesionVencida,
    rol,
    nombre,
    esAdmin,
    cargarUsuario,
    cargarCotizaciones,
    cargarCalendario,
    cargarSalones,
    cargarStock,
    alVolverAEntrar,
  };
}
