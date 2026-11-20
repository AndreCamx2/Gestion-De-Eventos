import { useState, useEffect, useMemo, useRef } from "react";
import { listarSalones, listarMontajes, listarSalonMontajes } from "../../api/salones";
import { listarSitios } from "../../api/sitios";
import { formatoNumero, normalizar } from "./salones";
import { useFuncionEstable } from "../../hooks/useFuncionEstable";

export function useSalones() {
  const [salones, setSalones] = useState([]);
  const [montajes, setMontajes] = useState([]);
  const [salonMontajes, setSalonMontajes] = useState([]);
  const [sitios, setSitios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [sesionVencida, setSesionVencida] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroMontaje, setFiltroMontaje] = useState("");
  const [aforoMinimo, setAforoMinimo] = useState("");
  const [mostrarBajas, setMostrarBajas] = useState(false);

  const [dialogo, setDialogo] = useState(null);
  const [aviso, setAviso] = useState(null);

  const buscarRef = useRef(null);
  const nuevoSalonRef = useRef(null);
  const disparadorRef = useRef(null);
  const sesionRef = useRef(null);

  const cargaInicial = useFuncionEstable(() => cargarDatos());
  useEffect(() => {
    cargaInicial();
  }, [cargaInicial]);

  // Al cerrar un diálogo el foco vuelve a quien lo abrió. Si ese botón ya no
  // existe (p. ej. el "Nuevo salón" del estado vacío), va al de la cabecera.
  useEffect(() => {
    if (dialogo !== null) return;
    // Puede ser un id: el botón que recibe el foco aparece al pintar (al quitar un montaje).
    const disparador = disparadorRef.current;
    if (!disparador) return;
    disparadorRef.current = null;
    const destino = typeof disparador === "string" ? document.getElementById(disparador) : disparador;
    (destino?.isConnected ? destino : nuevoSalonRef.current)?.focus();
  }, [dialogo]);

  async function cargarDatos() {
    setCargando(true);
    setErrorCarga(null);
    try {
      const [salonesData, montajesData, salonMontajesData, sitiosData] = await Promise.all([
        listarSalones({ incluirInactivos: mostrarBajas }),
        listarMontajes(),
        listarSalonMontajes(),
        listarSitios(),
      ]);
      setSalones(salonesData);
      setMontajes(montajesData);
      setSalonMontajes(salonMontajesData);
      setSitios(sitiosData);
    } catch (err) {
      if (err.status === 401) {
        setErrorCarga("sesion");
        setSesionVencida(true);
      } else if (err.status === 403) {
        setErrorCarga("permiso");
      } else {
        setErrorCarga("servidor");
      }
    } finally {
      setCargando(false);
    }
  }

  const habilitadosPorSalon = useMemo(() => {
    const orden = new Map(montajes.map((m, i) => [m.id, i]));
    const nombres = new Map(montajes.map((m) => [m.id, m.nombre]));
    const mapa = new Map();
    salonMontajes.forEach((sm) => {
      const lista = mapa.get(sm.salon) ?? [];
      lista.push({ id: sm.id, montajeId: sm.montaje, nombre: nombres.get(sm.montaje) ?? "Montaje", aforo: sm.aforo });
      mapa.set(sm.salon, lista);
    });
    mapa.forEach((lista) => lista.sort((a, b) => (orden.get(a.montajeId) ?? 0) - (orden.get(b.montajeId) ?? 0)));
    return mapa;
  }, [montajes, salonMontajes]);

  const nombreSitio = useMemo(() => new Map(sitios.map((s) => [s.id, s.nombre])), [sitios]);
  const variosSitios = new Set(salones.map((s) => s.sitio)).size > 1;

  function habilitadosDe(salonId) {
    return habilitadosPorSalon.get(salonId) ?? [];
  }

  // Filtros en el navegador. "Aforo mínimo" se calcula con los montajes: el salón
  // pasa si alguno alcanza ese aforo; con un montaje elegido, cuenta solo ese.
  const salonesFiltrados = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    const minimo = Number(aforoMinimo) || 0;
    return salones.filter((s) => {
      if (texto && !normalizar(s.nombre).includes(texto)) return false;
      const habilitados = habilitadosPorSalon.get(s.id) ?? [];
      const candidatos = filtroMontaje
        ? habilitados.filter((h) => h.montajeId === Number(filtroMontaje))
        : habilitados;
      if (filtroMontaje && candidatos.length === 0) return false;
      if (minimo > 0 && !candidatos.some((h) => h.aforo >= minimo)) return false;
      return true;
    });
  }, [salones, habilitadosPorSalon, busqueda, filtroMontaje, aforoMinimo]);

  const hayFiltros = busqueda.trim() !== "" || filtroMontaje !== "" || Number(aforoMinimo) > 0;
  const datosListos = !cargando && !errorCarga;

  function abrirDialogo(nuevo, evento) {
    disparadorRef.current = evento?.currentTarget ?? document.activeElement;
    setAviso(null);
    setDialogo(nuevo);
  }

  function cerrarDialogo() {
    setDialogo(null);
  }

  function alCrearSalon(salon) {
    setSalones((prev) => [...prev, salon]);
    setDialogo(null);
    setAviso(`Salón «${salon.nombre}» creado. Ahora habilita sus montajes con su aforo.`);
  }

  function alHabilitarMontaje(salonMontaje) {
    setSalonMontajes((prev) => [...prev, salonMontaje]);
    setDialogo(null);
    const salon = salones.find((s) => s.id === salonMontaje.salon);
    const montaje = montajes.find((m) => m.id === salonMontaje.montaje);
    setAviso(
      `${montaje?.nombre ?? "Montaje"} habilitado en «${salon?.nombre ?? "el salón"}» con aforo de ${formatoNumero.format(salonMontaje.aforo)}.`,
    );
  }

  function alEditarSalon(salon) {
    setSalones((prev) => prev.map((s) => (s.id === salon.id ? salon : s)));
    setDialogo(null);
    setAviso(`Salón «${salon.nombre}» actualizado.`);
  }

  function alEditarAforo(salonMontaje) {
    setSalonMontajes((prev) => prev.map((sm) => (sm.id === salonMontaje.id ? salonMontaje : sm)));
    setDialogo(null);
    setAviso(`Aforo actualizado a ${formatoNumero.format(salonMontaje.aforo)} personas.`);
  }

  function alQuitarMontaje(id) {
    const { salon, habilitado } = dialogo;
    setSalonMontajes((prev) => prev.filter((sm) => sm.id !== id));
    disparadorRef.current = `salon-${salon.id}-habilitar`;
    setDialogo(null);
    setAviso(`${habilitado.nombre} ya no está habilitado en «${salon.nombre}».`);
  }

  function alCambiarActivo(salon) {
    const sigue = salon.activo || mostrarBajas;
    setSalones((prev) => (sigue ? prev.map((s) => (s.id === salon.id ? salon : s)) : prev.filter((s) => s.id !== salon.id)));
    disparadorRef.current = sigue ? `salon-${salon.id}-estado` : "salones-mostrar-bajas";
    setDialogo(null);
    setAviso(`Salón «${salon.nombre}» ${salon.activo ? "reactivado: vuelve a aparecer en el Rack, el Calendario y Nueva cotización" : "dado de baja"}.`);
  }

  async function cambiarMostrarBajas(valor) {
    setMostrarBajas(valor);
    try {
      setSalones(await listarSalones({ incluirInactivos: valor }));
    } catch (err) {
      if (err.status === 401) setSesionVencida(true);
      setErrorCarga(err.status === 401 ? "sesion" : err.status === 403 ? "permiso" : "servidor");
    }
  }

  function quitarFiltros() {
    setBusqueda("");
    setFiltroMontaje("");
    setAforoMinimo("");
    buscarRef.current?.focus();
  }

  function entrarDeNuevoDesdeVentana(evento) {
    const guardar = evento.currentTarget.form?.querySelector('button[type="submit"]');
    sesionRef.current?.abrir({ focoAlVolver: guardar });
  }

  function alVolverAEntrar() {
    setSesionVencida(false);
    if (errorCarga === "sesion") cargarDatos();
  }

  function etiquetaSalon(s) {
    return variosSitios ? `${s.nombre} · ${nombreSitio.get(s.sitio) ?? "Venue"}` : s.nombre;
  }

  const propsVentana = {
    onCerrar: cerrarDialogo,
    onSesionVencida: () => setSesionVencida(true),
    sesionVencida,
    onEntrarDeNuevo: (boton) => sesionRef.current?.abrir({ focoAlVolver: boton }),
  };

  let vista = "lista";
  if (errorCarga === "permiso" || errorCarga === "servidor") vista = "error";
  else if (errorCarga === "sesion") vista = "sesion";
  else if (cargando) vista = "carga";
  else if (salones.length === 0) vista = "vacio";
  else if (salonesFiltrados.length === 0) vista = "sinCoincidencias";

  return {
    salones, montajes, sitios, cargando, errorCarga, cargarDatos, vista, datosListos,
    busqueda, setBusqueda, filtroMontaje, setFiltroMontaje, aforoMinimo, setAforoMinimo,
    mostrarBajas, cambiarMostrarBajas, salonesFiltrados, hayFiltros, quitarFiltros, buscarRef,
    habilitadosDe, nombreSitio, etiquetaSalon,
    dialogo, aviso, abrirDialogo, cerrarDialogo, nuevoSalonRef, propsVentana, entrarDeNuevoDesdeVentana,
    alCrearSalon, alHabilitarMontaje, alEditarSalon, alEditarAforo, alQuitarMontaje, alCambiarActivo,
    sesionVencida, setSesionVencida, sesionRef, alVolverAEntrar,
  };
}
