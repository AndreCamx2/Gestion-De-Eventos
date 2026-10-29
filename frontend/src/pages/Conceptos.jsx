import { useState, useEffect, useMemo, useRef } from "react";
import { listarConceptos, listarSitios } from "../api/conceptos";
import SesionVencida from "../components/SesionVencida";
import {
  AvisoError,
  Boton,
  CabeceraPagina,
  Esqueleto,
  EstadoVacio,
  Tarjeta,
} from "../components/ui";
import { BuscarConcepto, FiltrosCabecera } from "./conceptos/ConceptosFiltros";
import ConceptosTabla from "./conceptos/ConceptosTabla";
import PanelConcepto from "./conceptos/PanelConcepto";
import DialogoNuevoConcepto from "./conceptos/DialogoNuevoConcepto";
import DialogoEstadoConcepto from "./conceptos/DialogoEstadoConcepto";
import "../styles/conceptos.css";

// Pantalla de Conceptos y precios: arma la cabecera con los filtros, la tabla,
// el panel del concepto elegido y las ventanas. Cada pieza vive en pages/conceptos/.
export default function Conceptos() {
  const [conceptos, setConceptos] = useState([]);
  const [sitios, setSitios] = useState([]);
  const [cargando, setCargando] = useState(true);
  // Error al cargar: null | "permiso" (403) | "servidor" (500 o sin red) | "sesion" (401).
  const [errorCarga, setErrorCarga] = useState(null);
  // 401: se avisa abajo sin salir de la pantalla (components/SesionVencida.jsx).
  const [sesionVencida, setSesionVencida] = useState(false);
  const [filtroSitio, setFiltroSitio] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [seleccionId, setSeleccionId] = useState(null);
  // Ventana abierta: null | { tipo: "nuevo" } | { tipo: "estado", concepto, activar }.
  const [dialogo, setDialogo] = useState(null);

  const panelRef = useRef(null);
  const nuevoRef = useRef(null);
  const buscarRef = useRef(null);
  const sesionRef = useRef(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    setErrorCarga(null);
    try {
      const [conceptosData, sitiosData] = await Promise.all([
        listarConceptos(),
        listarSitios(),
      ]);
      setConceptos(conceptosData);
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

  function obtenerNombreSitio(id) {
    const sitio = sitios.find((s) => s.id === id);
    return sitio ? sitio.nombre : `Venue #${id}`;
  }

  const conceptosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return conceptos
      .filter((c) => mostrarInactivos || c.activo)
      .filter((c) => filtroSitio === "todos" || String(c.sitio) === filtroSitio)
      .filter((c) => !texto || c.nombre.toLowerCase().includes(texto))
      .sort(
        (a, b) =>
          obtenerNombreSitio(a.sitio).localeCompare(
            obtenerNombreSitio(b.sitio),
            "es",
          ) || a.nombre.localeCompare(b.nombre, "es"),
      );
  }, [conceptos, sitios, filtroSitio, busqueda, mostrarInactivos]);

  const seleccionado =
    conceptosFiltrados.find((c) => c.id === seleccionId) ?? conceptosFiltrados[0] ?? null;

  function elegir(concepto) {
    setSeleccionId(concepto.id);
    if (window.matchMedia("(max-width: 960px)").matches) {
      const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() =>
        panelRef.current?.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" }),
      );
    }
  }

  // Sitio ya elegido en "Nuevo concepto": el del filtro, o el único que hay.
  function sitioInicial() {
    if (filtroSitio !== "todos") return filtroSitio;
    return sitios.length === 1 ? String(sitios[0].id) : "";
  }

  function cerrarDialogo() {
    const eraNuevo = dialogo?.tipo === "nuevo";
    setDialogo(null);
    if (eraNuevo) nuevoRef.current?.focus();
  }

  async function alCrear(creado) {
    if (creado?.id) setSeleccionId(creado.id);
    setDialogo(null);
    await cargarDatos();
    nuevoRef.current?.focus();
  }

  async function alCambiarEstado() {
    if (!dialogo.activar && !mostrarInactivos) setSeleccionId(null);
    setDialogo(null);
    await cargarDatos();
  }

  // "Entrar de nuevo" desde dentro de una ventana abierta (SGDE-94): el diálogo de
  // login se abre encima y, al entrar, el foco vuelve al botón de guardar de la ventana.
  function entrarDeNuevoDesdeVentana(boton) {
    sesionRef.current?.abrir({ focoAlVolver: boton });
  }

  function alVolverAEntrar() {
    setSesionVencida(false);
    // Si la sesión venció al cargar, los datos nunca llegaron: se piden otra vez.
    // El historial se pide solo (HistorialPrecios mira sesionVencida).
    if (errorCarga === "sesion") cargarDatos();
  }

  function quitarFiltros() {
    setBusqueda("");
    setFiltroSitio("todos");
    setMostrarInactivos(true);
    buscarRef.current?.focus();
  }

  // Si ya hay conceptos, la tabla se mantiene mientras se recarga o si la sesión
  // vence al recargar (no salta ni pierde lo escrito en el panel).
  let vista = "lista";
  if (errorCarga === "permiso" || errorCarga === "servidor") vista = "error";
  else if (conceptos.length === 0 && errorCarga === "sesion") vista = "sesion";
  else if (conceptos.length === 0 && cargando) vista = "carga";
  else if (conceptos.length === 0) vista = "vacio";
  else if (conceptosFiltrados.length === 0) vista = "sinCoincidencias";

  const abrirNuevo = () => setDialogo({ tipo: "nuevo" });

  return (
    <div className="conceptos-pv">
      <CabeceraPagina
        antetitulo="Catálogo"
        titulo="Conceptos y precios"
        subtitulo="Cada cambio de precio queda registrado con quién y cuándo."
        acciones={
          <>
            <FiltrosCabecera
              sitios={sitios}
              filtroSitio={filtroSitio}
              onFiltroSitio={setFiltroSitio}
              mostrarInactivos={mostrarInactivos}
              onMostrarInactivos={setMostrarInactivos}
            />
            <Boton ref={nuevoRef} onClick={abrirNuevo}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Nuevo concepto
            </Boton>
          </>
        }
      />

      {(vista === "lista" || vista === "sinCoincidencias") && (
        <BuscarConcepto ref={buscarRef} valor={busqueda} onCambiar={setBusqueda} />
      )}

      {vista === "error" && (
        <Tarjeta>
          <AvisoError tipo={errorCarga} onReintentar={cargarDatos} />
        </Tarjeta>
      )}

      {vista === "sesion" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Tu sesión expiró"
            texto="Vuelve a entrar con el aviso de abajo para ver los conceptos."
          />
        </Tarjeta>
      )}

      {vista === "carga" && (
        <Tarjeta>
          <Esqueleto filas={5} avatar={false} columnas={3} etiqueta="Cargando conceptos…" />
        </Tarjeta>
      )}

      {vista === "vacio" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Aún no hay conceptos"
            texto="Crea el primero con su precio e impuesto: alquiler, alimentos, equipos o lo que se cobre en un evento."
            accion={<Boton variante="secundario" onClick={abrirNuevo}>Nuevo concepto</Boton>}
          />
        </Tarjeta>
      )}

      {vista === "sinCoincidencias" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Ningún concepto coincide"
            texto="Prueba con otro nombre, otro venue o muestra también los inactivos."
            accion={<Boton variante="secundario" onClick={quitarFiltros}>Quitar filtros</Boton>}
          />
        </Tarjeta>
      )}

      {vista === "lista" && (
        <div className="conceptos-cuerpo">
          <ConceptosTabla
            conceptos={conceptosFiltrados}
            seleccionadoId={seleccionado?.id}
            mostrarSitio={filtroSitio === "todos" && sitios.length > 1}
            nombreSitio={obtenerNombreSitio}
            onElegir={elegir}
          />

          {seleccionado && (
            <PanelConcepto
              key={seleccionado.id}
              ref={panelRef}
              concepto={seleccionado}
              nombreSitio={obtenerNombreSitio}
              onGuardado={cargarDatos}
              onCambiarEstado={() =>
                setDialogo({ tipo: "estado", concepto: seleccionado, activar: !seleccionado.activo })
              }
              sesionVencida={sesionVencida}
              onSesionVencida={() => setSesionVencida(true)}
            />
          )}
        </div>
      )}

      {dialogo?.tipo === "nuevo" && (
        <DialogoNuevoConcepto
          sitios={sitios}
          sitioInicial={sitioInicial()}
          onCreado={alCrear}
          onCerrar={cerrarDialogo}
          onSesionVencida={() => setSesionVencida(true)}
          sesionVencida={sesionVencida}
          onEntrarDeNuevo={entrarDeNuevoDesdeVentana}
        />
      )}

      {dialogo?.tipo === "estado" && (
        <DialogoEstadoConcepto
          concepto={dialogo.concepto}
          activar={dialogo.activar}
          onHecho={alCambiarEstado}
          onCerrar={cerrarDialogo}
          onSesionVencida={() => setSesionVencida(true)}
          sesionVencida={sesionVencida}
          onEntrarDeNuevo={entrarDeNuevoDesdeVentana}
        />
      )}

      <SesionVencida ref={sesionRef} visible={sesionVencida} onReingreso={alVolverAEntrar} />
    </div>
  );
}
