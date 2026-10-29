import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { getCotizaciones } from "../api/cotizaciones";
import { listarTiposEvento } from "../api/tiposEvento";
import {
  AvisoError,
  Boton,
  CabeceraPagina,
  Esqueleto,
  EstadoVacio,
  Tarjeta,
} from "../components/ui";
import SesionVencida from "../components/SesionVencida";
import { hoyLocal, nombreMes } from "../utils/inicioCifras";
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
  const [grupoEvento, setGrupoEvento] = useState("");
  const [tipoEvento, setTipoEvento] = useState("");
  const [gruposEvento, setGruposEvento] = useState([]);
  const [cargandoTiposEvento, setCargandoTiposEvento] = useState(true);
  const [errorTiposEvento, setErrorTiposEvento] = useState(null);
  const ultimaPeticionRef = useRef(0);

  const cargarTiposEvento = useCallback(async () => {
    setCargandoTiposEvento(true);
    setErrorTiposEvento(null);
    try {
      setGruposEvento(await listarTiposEvento());
    } catch (error) {
      setGruposEvento([]);
      setErrorTiposEvento(
        error?.status === 401
          ? "Tu sesión expiró. Vuelve a entrar para filtrar por tipo de evento."
          : error?.status === 403
            ? "No tienes permiso para consultar el catálogo de tipos de evento."
            : "No pudimos cargar los tipos de evento. Inténtalo de nuevo.",
      );
      if (error?.status === 401) setSesionVencida(true);
    } finally {
      setCargandoTiposEvento(false);
    }
  }, []);

  useEffect(() => {
    cargarTiposEvento();
  }, [cargarTiposEvento]);

  // una sin filtros para las cifras y otra filtrada para la tabla.
  const cargarDatos = useCallback(async () => {
    const peticion = ++ultimaPeticionRef.current;
    const conFiltrosTabla = Boolean(desde || hasta || grupoEvento || tipoEvento);
    setCargando(true);
    setErrorCarga(null);
    const [deTodas, deTabla] = await Promise.allSettled([
      getCotizaciones(),
      conFiltrosTabla ? getCotizaciones({
        desde,
        hasta,
        grupo_evento: grupoEvento,
        tipo_evento: tipoEvento,
      }) : null,
    ]);
    if (peticion !== ultimaPeticionRef.current) return;

    const lista = (r) => (Array.isArray(r.value) ? r.value : []);
    const tabla = conFiltrosTabla ? deTabla : deTodas;
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
  }, [desde, hasta, grupoEvento, tipoEvento]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  function alVolverAEntrar() {
    setSesionVencida(false);
    if (errorTiposEvento?.startsWith("Tu sesión")) cargarTiposEvento();
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

  const hayFiltros = filtro !== "todas" || busqueda.trim() !== "" || desde !== "" || hasta !== ""
    || grupoEvento !== "" || tipoEvento !== "";

  function quitarFiltros() {
    setFiltro("todas");
    setBusqueda("");
    setDesde("");
    setHasta("");
    setGrupoEvento("");
    setTipoEvento("");
  }

  let vista = "lista";
  if (errorCarga === "permiso" || errorCarga === "servidor") vista = "error";
  else if (errorCarga === "fechas") vista = "fechas";
  else if (errorCarga === "sesion") vista = "sesion";
  else if (cargando) vista = "carga";
  else if (cotizaciones.length === 0 && !desde && !hasta && !grupoEvento && !tipoEvento) vista = "vacio";
  else if (filtradas.length === 0) vista = "sinCoincidencias";

  const sinConteos = vista === "error" || vista === "sesion" || vista === "carga" || vista === "fechas";
  const cifrasVisibles = todasCargadas && !errorCifras;

  return (
    <div className="cotizaciones-pv">
      <CabeceraPagina
        antetitulo="Operación"
        titulo="Cotizaciones"
        subtitulo="Todo lo que se ha ofrecido, en qué estado está y cuánto vale."
        acciones={
          <>
            <Boton as={Link} to="/cotizaciones/historico" variante="secundario">
              Histórico
            </Boton>
            <Boton as={Link} to="/cotizaciones/nueva">
              <span aria-hidden="true">+</span> Nueva cotización
            </Boton>
          </>
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
          <label className="cotizaciones-evento">
            <span className="cotizaciones-evento__etiqueta">Grupo de evento</span>
            <select
              className="cotizaciones-evento__control"
              value={grupoEvento}
              onChange={(evento) => {
                setGrupoEvento(evento.target.value);
                setTipoEvento("");
              }}
              disabled={cargandoTiposEvento || Boolean(errorTiposEvento)}
            >
              <option value="">Todos los grupos</option>
              {gruposEvento.map((grupo) => (
                <option key={grupo.id} value={String(grupo.id)}>{grupo.nombre}</option>
              ))}
            </select>
          </label>

          <label className="cotizaciones-evento">
            <span className="cotizaciones-evento__etiqueta">Tipo de evento</span>
            <select
              className="cotizaciones-evento__control"
              value={tipoEvento}
              onChange={(evento) => setTipoEvento(evento.target.value)}
              disabled={cargandoTiposEvento || Boolean(errorTiposEvento)}
            >
              <option value="">Todos los tipos</option>
              {gruposEvento
                .filter((grupo) => !grupoEvento || String(grupo.id) === grupoEvento)
                .flatMap((grupo) => grupo.tipos.map((tipo) => (
                  <option key={tipo.id} value={String(tipo.id)}>{tipo.nombre}</option>
                )))}
            </select>
          </label>

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
        {errorTiposEvento && (
          <p className="cotizaciones-filtros__error" role="alert">
            {errorTiposEvento}{" "}
            <button type="button" onClick={cargarTiposEvento}>Reintentar</button>
          </p>
        )}
      </div>

      {vista === "error" && (
        <Tarjeta>
          <AvisoError tipo={errorCarga} onReintentar={cargarDatos} />
        </Tarjeta>
      )}

      {vista === "fechas" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Revisa los filtros de cotizaciones"
            texto="Uno de los filtros no es válido. Corrígelo o quita los filtros."
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
            accion={<Boton as={Link} to="/cotizaciones/nueva" variante="secundario">Armar la primera</Boton>}
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
