import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getCotizaciones } from "../api/cotizaciones";
import {
  AvisoError,
  Boton,
  CabeceraPagina,
  Esqueleto,
  EstadoVacio,
  Tarjeta,
} from "../components/ui";
import SesionVencida from "../components/SesionVencida";
import { hoyLocal, nombreMes } from "./inicioCifras";
import {
  FILTROS,
  conteosPorEstado,
  estadoVisible,
  normalizar,
  resumen,
  tipoDeError,
} from "./cotizaciones/cotizaciones";
import CotizacionesCifras from "./cotizaciones/CotizacionesCifras";
import CotizacionesTabla from "./cotizaciones/CotizacionesTabla";
import "../styles/cotizaciones.css";

// Pantalla de Cotizaciones: carga, filtros y qué vista se muestra. Las cifras,
// la tabla y los formatos viven en pages/cotizaciones/.
export default function Cotizaciones() {
  // Regla: las cifras resumen TODAS las cotizaciones; los filtros (estado,
  // búsqueda y fechas del evento) solo afectan la tabla.
  // - todas: lista sin filtro de fechas, para las cifras.
  // - cotizaciones: lista de la tabla (con el filtro de fechas, si lo hay).
  const [todas, setTodas] = useState([]);
  const [todasCargadas, setTodasCargadas] = useState(false);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  // Errores: null | "permiso" (403) | "servidor" (500 o sin red) | "sesion" (401) | "fechas" (400).
  const [errorCarga, setErrorCarga] = useState(null);
  const [errorCifras, setErrorCifras] = useState(null);
  const [sesionVencida, setSesionVencida] = useState(false);

  const [filtro, setFiltro] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // Cada cambio de fecha lanza una carga. Si una vieja (por ejemplo, solo con
  // "desde") responde después de la nueva, se descarta: solo vale la última.
  const ultimaPeticionRef = useRef(0);

  // Sin fechas, una sola petición sirve para las cifras y la tabla. Con fechas,
  // una sin fechas para las cifras y otra con fechas para la tabla.
  const cargarDatos = useCallback(async () => {
    const peticion = ++ultimaPeticionRef.current;
    const conFechas = Boolean(desde || hasta);
    setCargando(true);
    setErrorCarga(null);
    const [deTodas, deTabla] = await Promise.allSettled([
      getCotizaciones(),
      conFechas ? getCotizaciones({ desde, hasta }) : null,
    ]);
    if (peticion !== ultimaPeticionRef.current) return;

    const lista = (r) => (Array.isArray(r.value) ? r.value : []);
    const tabla = conFechas ? deTabla : deTodas;
    if (deTodas.status === "fulfilled") {
      setTodas(lista(deTodas));
      setTodasCargadas(true);
    }
    if (tabla.status === "fulfilled") setCotizaciones(lista(tabla));
    // Si falla solo la de la tabla (por ejemplo, un 400 de fechas), las cifras siguen.
    const tipoCifras = deTodas.status === "rejected" ? tipoDeError(deTodas.reason) : null;
    const tipoTabla = tabla.status === "rejected" ? tipoDeError(tabla.reason) : null;
    setErrorCifras(tipoCifras);
    setErrorCarga(tipoTabla);
    if (tipoCifras === "sesion" || tipoTabla === "sesion") setSesionVencida(true);
    setCargando(false);
  }, [desde, hasta]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  function alVolverAEntrar() {
    setSesionVencida(false);
    if (errorCarga === "sesion" || errorCifras === "sesion") cargarDatos();
  }

  // Hoy se toma al cargar la lista: así las notas de vigencia y la tasa del mes
  // se calculan con la misma fecha que los datos.
  const hoy = useMemo(() => hoyLocal(), [todas, cotizaciones]);
  const cifras = useMemo(() => resumen(todas, hoy), [todas, hoy]);
  const conteos = useMemo(() => conteosPorEstado(cotizaciones), [cotizaciones]);

  const filtradas = useMemo(() => {
    const texto = normalizar(busqueda.trim()).replace(/^#/, "");
    return cotizaciones.filter((c) => {
      if (filtro !== "todas" && estadoVisible(c) !== filtro) return false;
      if (!texto) return true;
      return normalizar(c.cliente_nombre).includes(texto) || String(c.id).padStart(3, "0").includes(texto);
    });
  }, [cotizaciones, filtro, busqueda]);

  const hayFiltros = filtro !== "todas" || busqueda.trim() !== "" || desde !== "" || hasta !== "";

  function quitarFiltros() {
    setFiltro("todas");
    setBusqueda("");
    setDesde("");
    setHasta("");
  }

  let vista = "lista";
  if (errorCarga === "permiso" || errorCarga === "servidor") vista = "error";
  else if (errorCarga === "fechas") vista = "fechas";
  else if (errorCarga === "sesion") vista = "sesion";
  else if (cargando) vista = "carga";
  else if (cotizaciones.length === 0 && !desde && !hasta) vista = "vacio";
  else if (filtradas.length === 0) vista = "sinCoincidencias";

  // Los conteos de los botones de estado son de la tabla; las cifras, de todas.
  const sinConteos = vista === "error" || vista === "sesion" || vista === "carga" || vista === "fechas";
  // Mientras se recarga se siguen viendo las cifras anteriores: no dependen de las fechas.
  const cifrasVisibles = todasCargadas && !errorCifras;

  return (
    <div className="cotizaciones-pv">
      <CabeceraPagina
        antetitulo="Operación"
        titulo="Cotizaciones"
        subtitulo="Todo lo que se ha ofrecido, en qué estado está y cuánto vale."
        acciones={
          <Boton disabled title="Disponible cuando esté la pantalla de nueva cotización">
            <span aria-hidden="true">+</span> Nueva cotización
          </Boton>
        }
      />

      <CotizacionesCifras cifras={cifrasVisibles ? cifras : null} mes={nombreMes(hoy)} />

      <div className="cotizaciones-filtros">
        <div className="cotizaciones-estados" role="group" aria-label="Filtrar por estado">
          {FILTROS.map(({ clave, texto }) => (
            <button
              key={clave}
              type="button"
              className="cotizaciones-estado"
              aria-pressed={filtro === clave}
              onClick={() => setFiltro(clave)}
            >
              {texto}
              {!sinConteos && <span className="cotizaciones-estado__conteo">{conteos[clave] ?? 0}</span>}
            </button>
          ))}
        </div>

        <div className="cotizaciones-campos">
          <label className="cotizaciones-buscar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="visually-hidden">Buscar por cliente o número</span>
            <input
              type="search"
              className="cotizaciones-buscar__input"
              placeholder="Cliente o número"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>

          <label className="cotizaciones-fecha">
            <span className="cotizaciones-fecha__etiqueta">Evento desde</span>
            <input
              type="date"
              className="cotizaciones-fecha__input"
              value={desde}
              max={hasta || undefined}
              onChange={(e) => setDesde(e.target.value)}
            />
          </label>

          <label className="cotizaciones-fecha">
            <span className="cotizaciones-fecha__etiqueta">hasta</span>
            <input
              type="date"
              className="cotizaciones-fecha__input"
              value={hasta}
              min={desde || undefined}
              onChange={(e) => setHasta(e.target.value)}
            />
          </label>
        </div>
      </div>

      {vista === "error" && (
        <Tarjeta>
          <AvisoError tipo={errorCarga} onReintentar={cargarDatos} />
        </Tarjeta>
      )}

      {vista === "fechas" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Revisa las fechas del evento"
            texto="Una de las fechas no es válida. Corrígela o quita el filtro de fechas."
            accion={<Boton variante="secundario" onClick={quitarFiltros}>Quitar filtros</Boton>}
          />
        </Tarjeta>
      )}

      {vista === "sesion" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Tu sesión expiró"
            texto="Vuelve a entrar con el aviso de abajo para ver las cotizaciones."
          />
        </Tarjeta>
      )}

      {vista === "carga" && (
        <Tarjeta>
          <Esqueleto filas={5} avatar={false} columnas={3} etiqueta="Cargando cotizaciones…" />
        </Tarjeta>
      )}

      {vista === "vacio" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Aún no hay cotizaciones"
            texto="Cuando se arme la primera cotización aparecerá aquí con su vigencia y su estado."
          />
        </Tarjeta>
      )}

      {vista === "sinCoincidencias" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Ninguna cotización coincide"
            texto="Prueba con otro estado, otro cliente o un rango de fechas más amplio."
            accion={hayFiltros && <Boton variante="secundario" onClick={quitarFiltros}>Quitar filtros</Boton>}
          />
        </Tarjeta>
      )}

      {vista === "lista" && <CotizacionesTabla cotizaciones={filtradas} total={cotizaciones.length} hoy={hoy} />}

      <SesionVencida visible={sesionVencida} onReingreso={alVolverAEntrar} />
    </div>
  );
}
