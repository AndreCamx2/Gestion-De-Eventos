import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  listarClientes,
  crearCliente,
  listarEmpresas,
  actualizarCliente,
  darDeBajaCliente,
} from "../api/clientes";
import ClienteForm, {
  FORM_VACIO,
  formDesdeCliente,
  nitDeEmpresa,
  erroresDesdeApi,
  payloadEdicion,
} from "./ClienteForm";
import { Boton, CabeceraPagina, EstadoBadge, TablaContenedor } from "../components/ui";
import "../styles/directorio-clientes.css";

const FILTROS_TIPO = [
  { value: "todos", label: "Todos" },
  { value: "natural", label: "Natural" },
  { value: "juridica", label: "Jurídica" },
];

function iniciales(nombre) {
  const letras = String(nombre ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");
  return letras || "?";
}

// Minúsculas y sin tildes: así "perez" encuentra a "Pérez".
function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function hayDiferencias(a, b) {
  return Object.keys(a).some((campo) => a[campo] !== b[campo]);
}

// Ventana de confirmación con <dialog> nativo. showModal() deja inactivo el
// fondo, encierra el foco dentro y cierra con Escape (evento "cancel").
// `bloqueado` impide cerrarla mientras se procesa la acción.
function DialogoConfirmacion({ dialogoRef, idTitulo, titulo, bloqueado, onClose, children, acciones }) {
  return (
    <dialog
      ref={dialogoRef}
      className="directorio-dialogo"
      aria-labelledby={idTitulo}
      onCancel={(e) => bloqueado && e.preventDefault()}
      onClose={onClose}
      // Clic en el fondo oscuro: el destino es el propio <dialog>, no su contenido.
      onClick={(e) => e.target === e.currentTarget && !bloqueado && e.currentTarget.close()}
    >
      <div className="directorio-dialogo__contenido">
        <h2 id={idTitulo} className="directorio-dialogo__titulo">{titulo}</h2>
        {children}
        <div className="directorio-dialogo__acciones">{acciones}</div>
      </div>
    </dialog>
  );
}

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const navigate = useNavigate();

  // Panel lateral para crear y editar: null | { modo: "crear" } | { modo: "editar", cliente }.
  const [panel, setPanel] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  // Copia del formulario al abrir el panel: sirve para saber si hay cambios sin guardar.
  const [formInicial, setFormInicial] = useState(FORM_VACIO);
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorAccion, setErrorAccion] = useState(null);
  const [errorBaja, setErrorBaja] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const tablaRef = useRef(null);
  const panelRef = useRef(null);
  const tituloPanelRef = useRef(null);
  const dialogoBajaRef = useRef(null);
  const dialogoDescartarRef = useRef(null);
  // Elemento que abrió el diálogo: recibe el foco de vuelta al cerrarlo.
  const disparadorRef = useRef(null);
  // Acción que espera a que la persona confirme que descarta sus cambios.
  const accionPendienteRef = useRef(null);
  const guardarRef = useRef(null);
  // A dónde mover el foco cuando el panel termine de pintarse:
  // "titulo" | "campo" | "tabla" | "guardar".
  const focoPendienteRef = useRef(null);

  useEffect(() => {
    cargarDatos();
  }, [mostrarInactivos]);

  // El foco se mueve después de pintar, cuando el elemento destino ya existe.
  useEffect(() => {
    const destino = focoPendienteRef.current;
    if (!destino) return;
    focoPendienteRef.current = null;

    if (destino === "tabla") {
      tablaRef.current?.focus();
      return;
    }
    // Tras guardar: el botón estuvo deshabilitado y perdió el foco; vuelve a él
    // sin mover la página, junto al aviso "Cambios guardados".
    if (destino === "guardar") {
      guardarRef.current?.focus({ preventScroll: true });
      return;
    }
    const elemento =
      destino === "titulo"
        ? tituloPanelRef.current
        : panelRef.current?.querySelector("select, input, textarea");
    if (!elemento) return;
    elemento.focus({ preventScroll: true });

    // En pantallas angostas el panel queda debajo de la tabla: se baja hasta él.
    const caja = panelRef.current.getBoundingClientRect();
    if (caja.top < 0 || caja.top > window.innerHeight - 120) {
      const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      panelRef.current.scrollIntoView({ block: "start", behavior: reducir ? "auto" : "smooth" });
    }
  }, [panel]);

  function cerrarSesionExpirada() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    navigate("/login");
  }

  // Devuelve la lista nueva (o null si falló) para refrescar el cliente del panel.
  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      const [clientesData, empresasData] = await Promise.all([
        listarClientes({ incluirInactivos: mostrarInactivos }),
        listarEmpresas(),
      ]);
      setClientes(clientesData);
      setEmpresas(empresasData);
      return clientesData;
    } catch (err) {
      if (err.status === 401) {
        cerrarSesionExpirada();
      } else if (err.status === 403) {
        setError("No tienes permisos para consultar los clientes o empresas.");
      } else {
        setError("Error al comunicarse con el servidor. Intenta de nuevo.");
      }
      return null;
    } finally {
      setCargando(false);
    }
  }

  // Identificación propia del cliente; si no tiene (p. ej. jurídica del registro
  // público), el NIT de su empresa.
  function obtenerIdentificacion(c) {
    return c.identificacion || nitDeEmpresa(empresas, c.empresa) || "—";
  }

  const clientesFiltrados = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    return clientes
      .filter((c) => filtroTipo === "todos" || c.tipo === filtroTipo)
      .filter(
        (c) =>
          !texto ||
          [c.nombre, c.identificacion, nitDeEmpresa(empresas, c.empresa), c.correo].some((valor) =>
            normalizar(valor).includes(texto),
          ),
      );
  }, [clientes, empresas, filtroTipo, busqueda]);

  const hayCambios = panel !== null && hayDiferencias(form, formInicial);
  const clienteSeleccionado = panel?.modo === "editar" ? panel.cliente : null;

  function prepararPanel(datos) {
    setForm(datos);
    setFormInicial(datos);
    setErroresCampo({});
    setErrorAccion(null);
    setAviso(null);
  }

  function abrirEditar(cliente, { enfocar = true } = {}) {
    prepararPanel(formDesdeCliente(cliente));
    setPanel({ modo: "editar", cliente });
    if (enfocar) focoPendienteRef.current = "titulo";
  }

  function abrirCrear() {
    prepararPanel(FORM_VACIO);
    setPanel({ modo: "crear" });
    focoPendienteRef.current = "campo";
  }

  function cerrarPanel() {
    setPanel(null);
    focoPendienteRef.current = "tabla";
  }

  function abrirDialogo(dialogoRef) {
    disparadorRef.current = document.activeElement;
    dialogoRef.current?.showModal();
  }

  // Al cerrar un diálogo (Escape, "Cancelar", clic afuera), el foco vuelve a
  // quien lo abrió. Si la acción ya movió el foco, disparadorRef está vacío.
  function alCerrarDialogo() {
    const disparador = disparadorRef.current;
    disparadorRef.current = null;
    if (disparador?.isConnected) disparador.focus();
  }

  // Si el formulario tiene cambios sin guardar, pregunta antes de seguir.
  function siNoHayCambios(accion) {
    if (!hayCambios) {
      accion();
      return;
    }
    accionPendienteRef.current = accion;
    abrirDialogo(dialogoDescartarRef);
  }

  function descartarCambios() {
    const accion = accionPendienteRef.current;
    accionPendienteRef.current = null;
    disparadorRef.current = null;
    dialogoDescartarRef.current?.close();
    accion?.();
  }

  function seleccionar(cliente) {
    if (clienteSeleccionado?.id === cliente.id) return;
    siNoHayCambios(() => abrirEditar(cliente));
  }

  function abrirBaja() {
    setErrorBaja(null);
    abrirDialogo(dialogoBajaRef);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErroresCampo((prev) => ({ ...prev, [name]: undefined }));
    setAviso(null);
  }

  async function handleSubmitForm(e) {
    e.preventDefault();
    const esCrear = panel.modo === "crear";
    setErroresCampo({});
    setErrorAccion(null);
    setAviso(null);

    if (esCrear && form.tipo === "natural" && !form.identificacion.trim()) {
      setErroresCampo({ identificacion: "La identificación es obligatoria para personas naturales." });
      return;
    }

    setProcesando(true);
    try {
      let idCliente = panel.cliente?.id;
      if (esCrear) {
        const creado = await crearCliente({
          ...form,
          identificacion: form.identificacion.trim(),
          empresa: form.empresa ? Number(form.empresa) : undefined,
        });
        idCliente = creado?.id;
      } else {
        await actualizarCliente(panel.cliente.id, payloadEdicion(form));
      }
      // El panel queda abierto con los datos recién guardados.
      const lista = await cargarDatos();
      const guardado = lista?.find((c) => c.id === idCliente);
      if (guardado) {
        abrirEditar(guardado, { enfocar: esCrear });
        if (!esCrear) focoPendienteRef.current = "guardar";
        setAviso(esCrear ? "Cliente creado." : "Cambios guardados.");
      } else {
        cerrarPanel();
      }
    } catch (err) {
      if (err.status === 400 && err.body && typeof err.body === "object") {
        // Los errores por campo se muestran junto a su input; el resto, abajo.
        const { campos, general } = erroresDesdeApi(err.body);
        setErroresCampo(campos);
        setErrorAccion(general);
      } else if (err.status === 401) {
        cerrarSesionExpirada();
      } else if (err.status === 403) {
        setErrorAccion(`No tienes permisos suficientes para ${esCrear ? "registrar" : "editar"} clientes.`);
      } else if (err.status === 404) {
        setErrorAccion("Este cliente ya no existe. Cierra y actualiza la lista.");
      } else {
        setErrorAccion(`Error inesperado en el servidor al ${esCrear ? "registrar el cliente" : "guardar los cambios"}.`);
      }
    } finally {
      setProcesando(false);
    }
  }

  async function handleConfirmarBaja() {
    setErrorBaja(null);
    setProcesando(true);
    try {
      await darDeBajaCliente(clienteSeleccionado.id);
      // El botón "Dar de baja" desaparece con el panel: el foco va a la tabla.
      disparadorRef.current = null;
      dialogoBajaRef.current?.close();
      cerrarPanel();
      await cargarDatos();
    } catch (err) {
      if (err.status === 401) {
        cerrarSesionExpirada();
      } else if (err.status === 403) {
        setErrorBaja("No tienes permisos suficientes para dar de baja clientes.");
      } else if (err.status === 404) {
        setErrorBaja("Este cliente ya no existe. Cierra y actualiza la lista.");
      } else {
        setErrorBaja("Error inesperado en el servidor al dar de baja.");
      }
    } finally {
      setProcesando(false);
    }
  }

  // La tabla se mantiene en pantalla mientras se recarga (no salta ni pierde el foco).
  const mostrarTabla = !error && (!cargando || clientes.length > 0);

  return (
    <div className="directorio">
      <CabeceraPagina
        antetitulo="Administración"
        titulo="Clientes"
        subtitulo="Personas y empresas. Dar de baja no borra su historia."
        acciones={
          <Boton variante="principal" onClick={() => siNoHayCambios(abrirCrear)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo cliente
          </Boton>
        }
      />

      <div className="directorio-filtros">
        <div className="directorio-segmentado" role="group" aria-label="Tipo de cliente">
          {FILTROS_TIPO.map((f) => (
            <button
              key={f.value}
              type="button"
              className="directorio-segmentado__opcion"
              aria-pressed={filtroTipo === f.value}
              onClick={() => setFiltroTipo(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="directorio-filtros__derecha">
          <label className="directorio-buscar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              className="directorio-buscar__input"
              aria-label="Buscar cliente"
              placeholder="Nombre, NIT, cédula o correo"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>

          <button
            type="button"
            role="switch"
            className="directorio-interruptor"
            aria-checked={mostrarInactivos}
            onClick={() => setMostrarInactivos((valor) => !valor)}
          >
            <span className="directorio-interruptor__pista" aria-hidden="true">
              <span className="directorio-interruptor__perilla" />
            </span>
            Mostrar inactivos
          </button>
        </div>
      </div>

      <div className="directorio__cuerpo">
        <div className="directorio__lista">
          {cargando && (
            <p className="directorio-estado-carga" role="status">Cargando clientes...</p>
          )}
          {error && (
            <p className="directorio-aviso directorio-aviso--error" role="alert">Error: {error}</p>
          )}

          {mostrarTabla && (
            <TablaContenedor ref={tablaRef} etiqueta="Listado de clientes" aria-busy={cargando || undefined}>
              <table className="directorio-tabla">
                <colgroup>
                  <col />
                  <col className="directorio-tabla__col-tipo" />
                  <col className="directorio-tabla__col-ident" />
                  <col className="directorio-tabla__col-cotiz" />
                  <col className="directorio-tabla__col-estado" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Cliente</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Identificación</th>
                    <th scope="col" className="directorio-tabla__num">
                      <span aria-hidden="true">Cotiz.</span>
                      <span className="visually-hidden">Cotizaciones</span>
                    </th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map((c) => {
                    const seleccionado = clienteSeleccionado?.id === c.id;
                    const clases = [
                      "directorio-tabla__fila",
                      seleccionado && "directorio-tabla__fila--seleccionada",
                      !c.activo && "directorio-tabla__fila--inactiva",
                    ].filter(Boolean).join(" ");
                    return (
                      // Con mouse se puede hacer clic en toda la fila. El teclado y el
                      // lector de pantalla usan el botón del nombre: su clic sube hasta aquí.
                      <tr key={c.id} className={clases} onClick={() => seleccionar(c)}>
                        <td>
                          <button
                            type="button"
                            className="directorio-tabla__cliente"
                            aria-current={seleccionado || undefined}
                          >
                            <span className="directorio-avatar" aria-hidden="true">{iniciales(c.nombre)}</span>
                            <span className="directorio-tabla__textos">
                              <span className="directorio-tabla__nombre">{c.nombre}</span>
                              <span className="directorio-tabla__correo">{c.correo || "Sin correo"}</span>
                            </span>
                          </button>
                        </td>
                        <td className="directorio-tabla__tipo">{c.tipo === "juridica" ? "Jurídica" : "Natural"}</td>
                        <td className="directorio-tabla__ident">{obtenerIdentificacion(c)}</td>
                        <td className="directorio-tabla__num directorio-tabla__cotiz">{c.cotizaciones?.length ?? 0}</td>
                        <td>
                          <EstadoCliente activo={c.activo} />
                        </td>
                      </tr>
                    );
                  })}
                  {clientesFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="5" className="directorio-tabla__vacio">
                        No hay clientes que coincidan con el filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TablaContenedor>
          )}
        </div>

        <aside
          ref={panelRef}
          className={["directorio-panel", !panel && "directorio-panel--vacio"].filter(Boolean).join(" ")}
          aria-labelledby="directorio-panel-titulo"
        >
          {!panel ? (
            <div className="directorio-panel__vacio">
              <h2 id="directorio-panel-titulo" className="directorio-panel__vacio-titulo">Ningún cliente seleccionado</h2>
              <p>Selecciona un cliente para ver y editar sus datos, o crea uno nuevo.</p>
            </div>
          ) : (
            <>
              <div className="directorio-panel__cabecera">
                {clienteSeleccionado && (
                  <span className="directorio-avatar directorio-avatar--grande" aria-hidden="true">
                    {iniciales(clienteSeleccionado.nombre)}
                  </span>
                )}
                <div className="directorio-panel__textos">
                  <p className="directorio-panel__antetitulo">
                    {clienteSeleccionado ? "Editar cliente" : "Nuevo cliente"}
                  </p>
                  <h2
                    id="directorio-panel-titulo"
                    ref={tituloPanelRef}
                    tabIndex={-1}
                    className="directorio-panel__titulo"
                  >
                    {clienteSeleccionado ? clienteSeleccionado.nombre : "Datos del cliente"}
                  </h2>
                  {clienteSeleccionado && (
                    <p className="directorio-panel__meta">
                      Cliente desde {new Date(clienteSeleccionado.creado_en).toLocaleDateString("es-CO")}
                      {!clienteSeleccionado.activo && <EstadoCliente activo={false} />}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="directorio-panel__cerrar"
                  aria-label="Cerrar panel"
                  onClick={() => siNoHayCambios(cerrarPanel)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <form className="directorio-panel__form" onSubmit={handleSubmitForm} noValidate>
                <ClienteForm
                  idPrefix={panel.modo}
                  form={form}
                  errores={erroresCampo}
                  empresas={empresas}
                  onChange={handleChange}
                />

                {errorAccion && (
                  <p className="directorio-aviso directorio-aviso--error" role="alert">Error: {errorAccion}</p>
                )}
                {/* Siempre presente (aunque vacío) para que el lector de pantalla anuncie el aviso. */}
                <p className="directorio-aviso directorio-aviso--exito" role="status">
                  {aviso}
                </p>

                <div className="directorio-panel__acciones">
                  <Boton
                    ref={guardarRef}
                    type="submit"
                    variante="oscuro"
                    className="directorio-panel__guardar"
                    disabled={procesando}
                  >
                    {procesando ? "Guardando..." : clienteSeleccionado ? "Guardar cambios" : "Guardar"}
                  </Boton>
                  {clienteSeleccionado ? (
                    clienteSeleccionado.activo && (
                      <Boton variante="peligro" onClick={abrirBaja} disabled={procesando}>
                        Dar de baja
                      </Boton>
                    )
                  ) : (
                    <Boton variante="secundario" onClick={() => siNoHayCambios(cerrarPanel)} disabled={procesando}>
                      Cancelar
                    </Boton>
                  )}
                </div>

                {clienteSeleccionado && (
                  <p className="directorio-panel__nota">
                    {clienteSeleccionado.activo
                      ? "Dar de baja también le quita el acceso al sistema. Sus cotizaciones se conservan."
                      : "Este cliente está dado de baja: no puede iniciar sesión. Sus cotizaciones se conservan."}
                  </p>
                )}
              </form>

              {clienteSeleccionado && (
                <section className="directorio-historial" aria-labelledby="directorio-historial-titulo">
                  <h3 id="directorio-historial-titulo" className="directorio-historial__titulo">Cotizaciones</h3>
                  {clienteSeleccionado.cotizaciones?.length ? (
                    <div className="directorio-historial__caja">
                      <table className="directorio-historial__tabla">
                        <thead>
                          <tr>
                            <th scope="col">N.º</th>
                            <th scope="col">Estado</th>
                            <th scope="col">Fecha del evento</th>
                            <th scope="col" className="directorio-tabla__num">Personas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clienteSeleccionado.cotizaciones.map((q) => (
                            <tr key={q.id}>
                              <td className="directorio-historial__id">#{q.id}</td>
                              <td><EstadoBadge estado={q.estado} /></td>
                              <td>{q.fecha_evento || "—"}</td>
                              <td className="directorio-tabla__num">{q.cantidad_personas ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="directorio-historial__vacio">Este cliente aún no tiene cotizaciones.</p>
                  )}
                </section>
              )}
            </>
          )}
        </aside>
      </div>

      <DialogoConfirmacion
        dialogoRef={dialogoBajaRef}
        idTitulo="directorio-baja-titulo"
        titulo="Dar de baja"
        bloqueado={procesando}
        onClose={alCerrarDialogo}
        acciones={
          <>
            {/* "Cancelar" va primero: al abrir, el foco cae en la opción segura. */}
            <Boton variante="secundario" onClick={() => dialogoBajaRef.current?.close()} disabled={procesando}>
              Cancelar
            </Boton>
            <Boton variante="peligro" onClick={handleConfirmarBaja} disabled={procesando}>
              {procesando ? "Procesando..." : "Dar de baja"}
            </Boton>
          </>
        }
      >
        <p className="directorio-dialogo__texto">
          ¿Dar de baja a <strong>{clienteSeleccionado?.nombre}</strong>? El cliente dejará de aparecer en la lista y su
          usuario no podrá iniciar sesión. Sus datos y cotizaciones se conservan.
        </p>
        {errorBaja && (
          <p className="directorio-aviso directorio-aviso--error" role="alert">Error: {errorBaja}</p>
        )}
      </DialogoConfirmacion>

      <DialogoConfirmacion
        dialogoRef={dialogoDescartarRef}
        idTitulo="directorio-descartar-titulo"
        titulo="Cambios sin guardar"
        bloqueado={false}
        onClose={alCerrarDialogo}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => dialogoDescartarRef.current?.close()}>
              Seguir editando
            </Boton>
            <Boton variante="peligro" onClick={descartarCambios}>
              Descartar
            </Boton>
          </>
        }
      >
        <p className="directorio-dialogo__texto">Tienes cambios sin guardar. ¿Descartarlos?</p>
      </DialogoConfirmacion>
    </div>
  );
}

// Activo / Inactivo con texto y punto, como EstadoBadge (que es solo para cotizaciones).
function EstadoCliente({ activo }) {
  return (
    <span className={`directorio-estado ${activo ? "directorio-estado--activo" : "directorio-estado--inactivo"}`}>
      <span className="directorio-estado__punto" aria-hidden="true" />
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}
