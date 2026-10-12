import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../api/auth";
import {
  listarConceptos,
  crearConcepto,
  actualizarConcepto,
  cambiarEstadoConcepto,
  historialConcepto,
  listarSitios,
} from "../api/conceptos";
import ConceptoForm, {
  FORM_VACIO,
  OPCIONES_IMPUESTO,
  formDesdeConcepto,
  formatCOP,
  precioConImpuesto,
  etiquetaImpuesto,
  claseImpuesto,
  validarForm,
  payloadCreacion,
  payloadEdicion,
  erroresDesdeApi,
} from "./ConceptoForm";
import {
  AvisoError,
  Boton,
  CabeceraPagina,
  Esqueleto,
  EstadoVacio,
  TablaContenedor,
  Tarjeta,
} from "../components/ui";
import "../styles/conceptos.css";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const formatoPorcentaje = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

function fechaHistorial(texto) {
  const f = new Date(texto);
  if (Number.isNaN(f.getTime())) return "";
  return `${f.getDate()} ${MESES[f.getMonth()]} ${f.getFullYear()}`;
}

function variacion(anterior, nuevo) {
  const a = Number(anterior);
  const n = Number(nuevo);
  if (!a) return null;
  const pct = ((n - a) / a) * 100;
  return { texto: `${pct > 0 ? "+" : ""}${formatoPorcentaje.format(pct)}%`, sube: pct > 0 };
}

function Dialogo({ idTitulo, titulo, bloqueado, onCerrar, children }) {
  const dialogoRef = useRef(null);

  useEffect(() => {
    const dialogo = dialogoRef.current;
    if (dialogo.open) return;
    dialogo.showModal();
    const inicial =
      dialogo.querySelector("[data-foco-inicial]:not(:disabled)") ??
      dialogo.querySelector("input, select, button:not(.conceptos-dialogo__cerrar)");
    inicial?.focus();
  }, []);

  return (
    <dialog
      ref={dialogoRef}
      className="conceptos-dialogo"
      aria-labelledby={idTitulo}
      onCancel={(e) => bloqueado && e.preventDefault()}
      onClose={onCerrar}
    >
      <div className="conceptos-dialogo__cabecera">
        <h2 id={idTitulo} className="conceptos-dialogo__titulo">
          {titulo}
        </h2>
        <button
          type="button"
          className="conceptos-dialogo__cerrar"
          aria-label="Cerrar"
          disabled={bloqueado}
          onClick={() => dialogoRef.current?.close()}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      {children}
    </dialog>
  );
}

function cerrarDialogoDe(elemento) {
  elemento?.closest("dialog")?.close();
}

export default function Conceptos() {
  const [conceptos, setConceptos] = useState([]);
  const [sitios, setSitios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [filtroSitio, setFiltroSitio] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const navigate = useNavigate();

  const [seleccionId, setSeleccionId] = useState(null);
  const [formPanel, setFormPanel] = useState(FORM_VACIO);
  const [erroresPanel, setErroresPanel] = useState({});
  const [errorPanel, setErrorPanel] = useState(null);
  const [guardandoPanel, setGuardandoPanel] = useState(false);
  const [avisoPanel, setAvisoPanel] = useState("");

  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState(null);
  const [versionHistorial, setVersionHistorial] = useState(0);

  const [dialogoNuevo, setDialogoNuevo] = useState(false);
  const [formNuevo, setFormNuevo] = useState(FORM_VACIO);
  const [erroresNuevo, setErroresNuevo] = useState({});
  const [errorNuevo, setErrorNuevo] = useState(null);
  const [creando, setCreando] = useState(false);

  const [cambioEstado, setCambioEstado] = useState(null);
  const [errorEstado, setErrorEstado] = useState(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  const panelRef = useRef(null);
  const nuevoRef = useRef(null);
  const buscarRef = useRef(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  function cerrarSesionExpirada() {
    // logout() también invalida el refresh en el servidor (SGDE-92); no se espera.
    logout();
    navigate("/login");
  }

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
        cerrarSesionExpirada();
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
    return sitio ? sitio.nombre : `Sitio #${id}`;
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
  const mostrarSitioEnFila = filtroSitio === "todos" && sitios.length > 1;

  useEffect(() => {
    if (!seleccionado) return;
    setFormPanel(formDesdeConcepto(seleccionado));
    setErroresPanel({});
    setErrorPanel(null);
  }, [seleccionado]);

  useEffect(() => {
    setAvisoPanel("");
  }, [seleccionado?.id]);

  useEffect(() => {
    if (!seleccionado) return undefined;
    let cancelado = false;
    setHistorial([]);
    setErrorHistorial(null);
    setCargandoHistorial(true);
    historialConcepto(seleccionado.id)
      .then((data) => {
        if (!cancelado) setHistorial(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (cancelado) return;
        if (err.status === 401) cerrarSesionExpirada();
        else setErrorHistorial("No se pudo cargar el historial de precios.");
      })
      .finally(() => {
        if (!cancelado) setCargandoHistorial(false);
      });
    return () => {
      cancelado = true;
    };
  }, [seleccionado?.id, versionHistorial]);

  const historialOrdenado = useMemo(
    () => [...historial].sort((a, b) => new Date(b.fecha_modificacion) - new Date(a.fecha_modificacion)),
    [historial],
  );

  function elegir(concepto) {
    setSeleccionId(concepto.id);
    if (window.matchMedia("(max-width: 960px)").matches) {
      const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() =>
        panelRef.current?.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" }),
      );
    }
  }

  function cambiarPanel(e) {
    const { name, value } = e.target;
    setFormPanel((prev) => ({ ...prev, [name]: value }));
    setErroresPanel((prev) => ({ ...prev, [name]: undefined }));
    setAvisoPanel("");
  }

  function cambiarNuevo(e) {
    const { name, value } = e.target;
    setFormNuevo((prev) => ({ ...prev, [name]: value }));
    setErroresNuevo((prev) => ({ ...prev, [name]: undefined }));
  }

  function abrirNuevo() {
    const sitioInicial =
      filtroSitio !== "todos"
        ? filtroSitio
        : sitios.length === 1
          ? String(sitios[0].id)
          : "";
    setFormNuevo({ ...FORM_VACIO, sitio: sitioInicial });
    setErroresNuevo({});
    setErrorNuevo(null);
    setDialogoNuevo(true);
  }

  function cerrarNuevo() {
    setDialogoNuevo(false);
    nuevoRef.current?.focus();
  }

  async function guardarPanel(e) {
    e.preventDefault();
    if (!seleccionado) return;
    setErrorPanel(null);
    setAvisoPanel("");

    const erroresLocales = validarForm(formPanel);
    setErroresPanel(erroresLocales);
    if (Object.keys(erroresLocales).length > 0) return;

    setGuardandoPanel(true);
    try {
      await actualizarConcepto(seleccionado.id, payloadEdicion(formPanel));
      await cargarDatos();
      setVersionHistorial((v) => v + 1);
      setAvisoPanel("Cambios guardados.");
    } catch (err) {
      if (err.status === 400 && err.body && typeof err.body === "object") {
        const { campos, general } = erroresDesdeApi(err.body);
        setErroresPanel(campos);
        setErrorPanel(general);
      } else if (err.status === 401) {
        cerrarSesionExpirada();
      } else if (err.status === 403) {
        setErrorPanel("No tienes permisos suficientes para editar conceptos.");
      } else if (err.status === 404) {
        setErrorPanel("Este concepto ya no existe. Actualiza la lista.");
      } else {
        setErrorPanel("Error inesperado en el servidor al guardar los cambios.");
      }
    } finally {
      setGuardandoPanel(false);
    }
  }

  async function crear(e) {
    e.preventDefault();
    setErrorNuevo(null);

    const erroresLocales = validarForm(formNuevo);
    setErroresNuevo(erroresLocales);
    if (Object.keys(erroresLocales).length > 0) return;

    setCreando(true);
    try {
      const creado = await crearConcepto(payloadCreacion(formNuevo));
      if (creado?.id) setSeleccionId(creado.id);
      setDialogoNuevo(false);
      await cargarDatos();
      nuevoRef.current?.focus();
    } catch (err) {
      if (err.status === 400 && err.body && typeof err.body === "object") {
        const { campos, general } = erroresDesdeApi(err.body);
        setErroresNuevo(campos);
        setErrorNuevo(general);
      } else if (err.status === 401) {
        cerrarSesionExpirada();
      } else if (err.status === 403) {
        setErrorNuevo("No tienes permisos suficientes para crear conceptos.");
      } else {
        setErrorNuevo("Error inesperado en el servidor al crear el concepto.");
      }
    } finally {
      setCreando(false);
    }
  }

  function abrirCambioEstado(concepto) {
    setErrorEstado(null);
    setCambioEstado({ concepto, activar: !concepto.activo });
  }

  async function confirmarCambioEstado() {
    const { concepto, activar } = cambioEstado;
    setErrorEstado(null);
    setCambiandoEstado(true);
    try {
      await cambiarEstadoConcepto(concepto.id, activar);
      if (!activar && !mostrarInactivos) setSeleccionId(null);
      setCambioEstado(null);
      await cargarDatos();
    } catch (err) {
      if (err.status === 401) {
        cerrarSesionExpirada();
      } else if (err.status === 403) {
        setErrorEstado(
          `No tienes permisos suficientes para ${activar ? "reactivar" : "desactivar"} conceptos.`,
        );
      } else if (err.status === 404) {
        setErrorEstado("Este concepto ya no existe. Cierra y actualiza la lista.");
      } else {
        setErrorEstado(
          `Error inesperado en el servidor al ${activar ? "reactivar" : "desactivar"} el concepto.`,
        );
      }
    } finally {
      setCambiandoEstado(false);
    }
  }

  function quitarFiltros() {
    setBusqueda("");
    setFiltroSitio("todos");
    setMostrarInactivos(true);
    buscarRef.current?.focus();
  }

  const cambiaPrecio =
    seleccionado &&
    formPanel.precio !== "" &&
    !Number.isNaN(Number(formPanel.precio)) &&
    Number(formPanel.precio) !== Number(seleccionado.precio);

  const precioPanelValido =
    formPanel.precio !== "" && !Number.isNaN(Number(formPanel.precio)) && Number(formPanel.precio) >= 0;

  const impuestoPanelFueraDeLista = !OPCIONES_IMPUESTO.some((o) => o.value === formPanel.impuesto_pct);

  let vista = "lista";
  if (errorCarga) vista = "error";
  else if (cargando && conceptos.length === 0) vista = "carga";
  else if (conceptos.length === 0) vista = "vacio";
  else if (conceptosFiltrados.length === 0) vista = "sinCoincidencias";

  const errorPanelCampo = (campo) =>
    erroresPanel[campo] && (
      <p id={`panel-${campo}-error`} className="conceptos-campo__error">
        {erroresPanel[campo]}
      </p>
    );
  const describirPanel = (campo) =>
    erroresPanel[campo] ? { "aria-invalid": true, "aria-describedby": `panel-${campo}-error` } : {};

  return (
    <div className="conceptos-pv">
      <CabeceraPagina
        antetitulo="Catálogo"
        titulo="Conceptos y precios"
        subtitulo="Cada cambio de precio queda registrado con quién y cuándo."
        acciones={
          <>
            <label className="conceptos-sitio">
              <span className="conceptos-sitio__etiqueta">Sitio</span>
              <select
                className="conceptos-sitio__control"
                value={filtroSitio}
                onChange={(e) => setFiltroSitio(e.target.value)}
              >
                <option value="todos">Todos los sitios</option>
                {sitios.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="conceptos-inactivos">
              <input
                type="checkbox"
                checked={mostrarInactivos}
                onChange={(e) => setMostrarInactivos(e.target.checked)}
              />
              Mostrar inactivos
            </label>
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
        <label className="conceptos-buscar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <span className="visually-hidden">Buscar concepto por nombre</span>
          <input
            ref={buscarRef}
            type="search"
            className="conceptos-buscar__input"
            placeholder="Nombre del concepto"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
      )}

      {vista === "error" && (
        <Tarjeta>
          <AvisoError tipo={errorCarga} onReintentar={cargarDatos} />
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
            texto="Prueba con otro nombre, otro sitio o muestra también los inactivos."
            accion={<Boton variante="secundario" onClick={quitarFiltros}>Quitar filtros</Boton>}
          />
        </Tarjeta>
      )}

      {vista === "lista" && (
        <div className="conceptos-cuerpo">
          <TablaContenedor etiqueta="Listado de conceptos" className="conceptos-tabla-caja">
            <table className="conceptos-tabla">
              <thead>
                <tr>
                  <th scope="col">Concepto</th>
                  <th scope="col" className="conceptos-tabla__num">Precio</th>
                  <th scope="col">Imp.</th>
                  <th scope="col" className="conceptos-tabla__num">Con impuesto</th>
                </tr>
              </thead>
              <tbody>
                {conceptosFiltrados.map((c) => {
                  const activo = seleccionado?.id === c.id;
                  return (
                    <tr
                      key={c.id}
                      className={[
                        "conceptos-fila",
                        activo && "conceptos-fila--seleccionada",
                        !c.activo && "conceptos-fila--inactiva",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => elegir(c)}
                    >
                      <td className="conceptos-tabla__nombre">
                        <button
                          type="button"
                          className="conceptos-fila__boton"
                          aria-pressed={activo}
                          onClick={(e) => {
                            e.stopPropagation();
                            elegir(c);
                          }}
                        >
                          {c.nombre}
                        </button>
                        {!c.activo && <span className="conceptos-inactivo">Inactivo</span>}
                        {mostrarSitioEnFila && (
                          <span className="conceptos-tabla__sitio">{obtenerNombreSitio(c.sitio)}</span>
                        )}
                      </td>
                      <td className="conceptos-tabla__num conceptos-tabla__suave">{formatCOP(c.precio)}</td>
                      <td>
                        <span className={`conceptos-impuesto ${claseImpuesto(c.impuesto_pct)}`}>
                          {etiquetaImpuesto(c.impuesto_pct)}
                        </span>
                      </td>
                      <td className="conceptos-tabla__num conceptos-tabla__fuerte">
                        {formatCOP(precioConImpuesto(c.precio, c.impuesto_pct))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TablaContenedor>

          {seleccionado && (
            <aside ref={panelRef} className="conceptos-panel" aria-label="Concepto seleccionado">
              <div>
                <p className="conceptos-panel__sitio">{obtenerNombreSitio(seleccionado.sitio)}</p>
                <h2 className="conceptos-panel__titulo">
                  {seleccionado.nombre}
                  {!seleccionado.activo && <span className="conceptos-inactivo">Inactivo</span>}
                </h2>
              </div>

              <form className="conceptos-panel__form" onSubmit={guardarPanel} noValidate>
                <div className="conceptos-panel__precios">
                  <div className={["conceptos-campo", erroresPanel.precio && "conceptos-campo--error"].filter(Boolean).join(" ")}>
                    <label className="conceptos-campo__etiqueta" htmlFor="panel-precio">
                      Precio sin impuesto
                    </label>
                    <div className="conceptos-precio">
                      <span className="conceptos-precio__signo" aria-hidden="true">$</span>
                      <input
                        id="panel-precio"
                        name="precio"
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        className="conceptos-precio__input"
                        value={formPanel.precio}
                        onChange={cambiarPanel}
                        {...describirPanel("precio")}
                      />
                    </div>
                    {errorPanelCampo("precio")}
                  </div>
                  <div className="conceptos-panel__final">
                    <span className="conceptos-campo__etiqueta">Con impuesto</span>
                    <span className="conceptos-panel__final-valor">
                      {precioPanelValido ? formatCOP(precioConImpuesto(formPanel.precio, formPanel.impuesto_pct)) : "—"}
                    </span>
                  </div>
                </div>

                <div className="conceptos-panel__par">
                  <div className={["conceptos-campo", erroresPanel.nombre && "conceptos-campo--error"].filter(Boolean).join(" ")}>
                    <label className="conceptos-campo__etiqueta" htmlFor="panel-nombre">Nombre</label>
                    <input
                      id="panel-nombre"
                      name="nombre"
                      type="text"
                      className="conceptos-campo__control"
                      value={formPanel.nombre}
                      onChange={cambiarPanel}
                      {...describirPanel("nombre")}
                    />
                    {errorPanelCampo("nombre")}
                  </div>
                  <div className={["conceptos-campo", erroresPanel.impuesto_pct && "conceptos-campo--error"].filter(Boolean).join(" ")}>
                    <label className="conceptos-campo__etiqueta" htmlFor="panel-impuesto_pct">Impuesto</label>
                    <select
                      id="panel-impuesto_pct"
                      name="impuesto_pct"
                      className="conceptos-campo__control"
                      value={formPanel.impuesto_pct}
                      onChange={cambiarPanel}
                      {...describirPanel("impuesto_pct")}
                    >
                      {OPCIONES_IMPUESTO.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                      {impuestoPanelFueraDeLista && (
                        <option value={formPanel.impuesto_pct}>{formPanel.impuesto_pct}% (valor actual)</option>
                      )}
                    </select>
                    {errorPanelCampo("impuesto_pct")}
                  </div>
                </div>

                <p className="conceptos-aviso">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M12 8v5M12 16h.01" />
                    <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
                  </svg>
                  <span>
                    {cambiaPrecio
                      ? `El precio cambia de ${formatCOP(seleccionado.precio)} a ${formatCOP(formPanel.precio)}. Quedará en el historial; las cotizaciones ya enviadas no cambian.`
                      : "Si cambias el precio, quedará en el historial. Las cotizaciones ya enviadas no cambian."}
                  </span>
                </p>

                {errorPanel && <p className="conceptos-error" role="alert">{errorPanel}</p>}

                <Boton type="submit" variante="oscuro" disabled={guardandoPanel} className="conceptos-panel__guardar">
                  {guardandoPanel ? "Guardando…" : "Guardar cambios"}
                </Boton>
                <p className="conceptos-panel__estado" role="status">{avisoPanel}</p>
              </form>

              <Boton
                variante={seleccionado.activo ? "peligro" : "secundario"}
                className="conceptos-panel__estado-boton"
                onClick={() => abrirCambioEstado(seleccionado)}
              >
                {seleccionado.activo ? "Desactivar concepto" : "Reactivar concepto"}
              </Boton>

              <section className="conceptos-historial" aria-labelledby="conceptos-historial-titulo">
                <h3 id="conceptos-historial-titulo" className="conceptos-historial__titulo">
                  Historial de precios
                </h3>
                {cargandoHistorial ? (
                  <Esqueleto filas={2} avatar={false} etiqueta="Cargando historial…" />
                ) : errorHistorial ? (
                  <p className="conceptos-error">{errorHistorial}</p>
                ) : historialOrdenado.length ? (
                  <ol className="conceptos-historial__lista">
                    {historialOrdenado.map((h) => {
                      const v = variacion(h.precio_anterior, h.precio_nuevo);
                      return (
                        <li key={h.id} className="conceptos-historial__item">
                          <span className="conceptos-historial__punto" aria-hidden="true" />
                          <div>
                            <p className="conceptos-historial__cambio">
                              <s className="conceptos-historial__antes">{formatCOP(h.precio_anterior)}</s>
                              <span aria-hidden="true">→</span>
                              <span className="visually-hidden">pasó a</span>
                              <strong>{formatCOP(h.precio_nuevo)}</strong>
                              {v && (
                                <span
                                  className={`conceptos-historial__delta ${v.sube ? "conceptos-historial__delta--sube" : "conceptos-historial__delta--baja"}`}
                                >
                                  {v.texto}
                                </span>
                              )}
                            </p>
                            <p className="conceptos-historial__meta">
                              {fechaHistorial(h.fecha_modificacion)} · por {h.modificado_por}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="conceptos-historial__vacio">Sin cambios de precio desde que se creó.</p>
                )}
              </section>
            </aside>
          )}
        </div>
      )}

      {dialogoNuevo && (
        <Dialogo idTitulo="conceptos-nuevo-titulo" titulo="Nuevo concepto" bloqueado={creando} onCerrar={cerrarNuevo}>
          <form className="conceptos-dialogo__form" onSubmit={crear} noValidate>
            <ConceptoForm
              idPrefix="crear"
              form={formNuevo}
              errores={erroresNuevo}
              sitios={sitios}
              onChange={cambiarNuevo}
              esEdicion={false}
            />
            {errorNuevo && <p className="conceptos-error" role="alert">{errorNuevo}</p>}
            <div className="conceptos-dialogo__acciones">
              <Boton variante="secundario" disabled={creando} onClick={(e) => cerrarDialogoDe(e.currentTarget)}>
                Cancelar
              </Boton>
              <Boton type="submit" variante="oscuro" disabled={creando}>
                {creando ? "Guardando…" : "Guardar"}
              </Boton>
            </div>
          </form>
        </Dialogo>
      )}

      {cambioEstado && (
        <Dialogo
          idTitulo="conceptos-estado-titulo"
          titulo={cambioEstado.activar ? "Reactivar concepto" : "Desactivar concepto"}
          bloqueado={cambiandoEstado}
          onCerrar={() => setCambioEstado(null)}
        >
          <div className="conceptos-dialogo__form">
            {cambioEstado.activar ? (
              <p className="conceptos-dialogo__texto">
                ¿Reactivar <strong>{cambioEstado.concepto.nombre}</strong>? Volverá a estar disponible
                para nuevas cotizaciones con su precio actual de {formatCOP(cambioEstado.concepto.precio)}.
              </p>
            ) : (
              <p className="conceptos-dialogo__texto">
                ¿Desactivar <strong>{cambioEstado.concepto.nombre}</strong>? Dejará de ofrecerse en nuevas
                cotizaciones. El concepto y su historial de precios se conservan, y puedes reactivarlo
                cuando quieras.
              </p>
            )}
            {errorEstado && <p className="conceptos-error" role="alert">{errorEstado}</p>}
            <div className="conceptos-dialogo__acciones">
              <Boton variante="secundario" disabled={cambiandoEstado} onClick={(e) => cerrarDialogoDe(e.currentTarget)}>
                Cancelar
              </Boton>
              <Boton
                variante={cambioEstado.activar ? "oscuro" : "peligro"}
                disabled={cambiandoEstado}
                onClick={confirmarCambioEstado}
                data-foco-inicial
              >
                {cambiandoEstado ? "Procesando…" : cambioEstado.activar ? "Reactivar" : "Desactivar"}
              </Boton>
            </div>
          </div>
        </Dialogo>
      )}
    </div>
  );
}
