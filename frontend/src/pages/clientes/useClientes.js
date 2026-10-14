import { useEffect, useMemo, useRef, useState } from "react";
import {
  listarClientes,
  crearCliente,
  listarEmpresas,
  actualizarCliente,
  darDeBajaCliente,
} from "../../api/clientes";
import { FORM_VACIO, formDesdeCliente, nitDeEmpresa, erroresDesdeApi, payloadEdicion } from "./clienteForm.js";
import { hayDiferencias, normalizar } from "./clientes";
import { useFocoPanel } from "./useFocoPanel";

// Estado y acciones de la pantalla de Clientes (SGDE-97): la lista con sus
// filtros, el panel para crear y editar, la baja, la reactivación, la empresa
// nueva y la sesión vencida. Clientes.jsx solo arma la pantalla con lo que
// devuelve; cada pieza vive en pages/clientes/.
export function useClientes() {
  const [clientes, setClientes] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [cargando, setCargando] = useState(true);
  // Error al cargar la lista: null | "permiso" (403) | "servidor" (500 o sin red) | "sesion" (401).
  const [errorCarga, setErrorCarga] = useState(null);
  // 401: se avisa abajo sin salir de la pantalla (components/SesionVencida.jsx).
  const [sesionVencida, setSesionVencida] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

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
  const [creandoEmpresa, setCreandoEmpresa] = useState(false);
  const [reactivando, setReactivando] = useState(false);
  // Cliente inactivo que se abre cuando la lista con inactivos termine de cargar (SGDE-95).
  const abrirAlCargarRef = useRef(null);

  const buscarRef = useRef(null);
  const dialogoBajaRef = useRef(null);
  // "Dar de baja" de la confirmación: recibe el foco al volver a entrar (SGDE-94).
  const confirmarBajaRef = useRef(null);
  // Para abrir "Entrar de nuevo" desde dentro de la confirmación modal (SGDE-94).
  const sesionRef = useRef(null);
  const dialogoDescartarRef = useRef(null);
  // Elemento que abrió el diálogo: recibe el foco de vuelta al cerrarlo.
  const disparadorRef = useRef(null);
  // Acción que espera a que la persona confirme que descarta sus cambios.
  const accionPendienteRef = useRef(null);

  useEffect(() => {
    cargarDatos();
  }, [mostrarInactivos]);

  const { tablaRef, panelRef, tituloPanelRef, guardarRef, focoPendienteRef } = useFocoPanel(panel);

  // Devuelve la lista nueva (o null si falló) para refrescar el cliente del panel.
  async function cargarDatos() {
    setCargando(true);
    setErrorCarga(null);
    try {
      const [clientesData, empresasData] = await Promise.all([
        listarClientes({ incluirInactivos: mostrarInactivos }),
        listarEmpresas(),
      ]);
      setClientes(clientesData);
      setEmpresas(empresasData);
      const pendiente = clientesData.find((c) => c.id === abrirAlCargarRef.current);
      abrirAlCargarRef.current = null;
      if (pendiente) abrirEditar(pendiente);
      return clientesData;
    } catch (err) {
      if (err.status === 401) {
        setErrorCarga("sesion");
        setSesionVencida(true);
      } else if (err.status === 403) {
        setErrorCarga("permiso");
      } else {
        setErrorCarga("servidor");
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

  // "Ver el cliente inactivo": si no está en la lista, se muestran los inactivos y se abre al cargar.
  function verClienteInactivo(id) {
    const cliente = clientes.find((c) => c.id === id);
    if (cliente) siNoHayCambios(() => abrirEditar(cliente));
    else siNoHayCambios(() => { abrirAlCargarRef.current = id; setMostrarInactivos(true); });
  }

  // Reactivado: la lista se recarga y el panel sigue abierto, con el foco en "Guardar cambios".
  async function alReactivarCliente() {
    const id = clienteSeleccionado.id;
    disparadorRef.current = null;
    setReactivando(false);
    const guardado = (await cargarDatos())?.find((c) => c.id === id);
    if (!guardado) return cerrarPanel();
    abrirEditar(guardado, { enfocar: false });
    focoPendienteRef.current = "guardar";
    setAviso("Cliente reactivado.");
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
        // El formulario se queda como está: al volver a entrar, se guarda de nuevo.
        setSesionVencida(true);
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
        // La confirmación sigue abierta y muestra el aviso dentro (la barra de abajo
        // queda inerte con una ventana modal abierta). Al volver a entrar, se pulsa
        // "Dar de baja" otra vez (SGDE-94).
        setSesionVencida(true);
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

  // Qué se ve en la zona de la lista. Si ya hay clientes, la tabla se mantiene
  // mientras se recarga (no salta ni pierde el foco).
  let vistaLista = "tabla";
  if (errorCarga === "permiso" || errorCarga === "servidor") vistaLista = "error";
  else if (clientes.length === 0 && errorCarga === "sesion") vistaLista = "sesion";
  else if (clientes.length === 0 && cargando) vistaLista = "carga";
  else if (clientes.length === 0) vistaLista = "vacio";
  else if (clientesFiltrados.length === 0) vistaLista = "sinCoincidencias";

  function quitarFiltros() {
    setFiltroTipo("todos");
    setBusqueda("");
    // El botón "Quitar filtros" desaparece: el foco pasa a la búsqueda.
    buscarRef.current?.focus();
  }

  function abrirNuevaEmpresa(evento) {
    disparadorRef.current = evento.currentTarget;
    setCreandoEmpresa(true);
  }

  function cerrarNuevaEmpresa() {
    setCreandoEmpresa(false);
    const disparador = disparadorRef.current;
    disparadorRef.current = null;
    if (disparador?.isConnected) disparador.focus();
  }

  function alCrearEmpresa(empresa) {
    setEmpresas((prev) => [...prev, empresa].sort((a, b) => a.razon_social.localeCompare(b.razon_social, "es")));
    setForm((prev) => ({ ...prev, empresa: String(empresa.id) }));
    setErroresCampo((prev) => ({ ...prev, empresa: undefined }));
    setAviso(`Empresa "${empresa.razon_social}" creada y asignada.`);
    disparadorRef.current = null;
    setCreandoEmpresa(false);
    requestAnimationFrame(() => document.getElementById(`${panel?.modo}-empresa`)?.focus());
  }

  function alVolverAEntrar() {
    setSesionVencida(false);
    // Si la sesión venció al cargar, la lista nunca llegó: se pide otra vez.
    if (errorCarga === "sesion") cargarDatos();
  }

  return {
    // Lista
    clientes, empresas, cargando, errorCarga, cargarDatos, clientesFiltrados, vistaLista, obtenerIdentificacion,
    filtroTipo, setFiltroTipo, busqueda, setBusqueda, mostrarInactivos, setMostrarInactivos, quitarFiltros, buscarRef,
    // Panel
    panel, form, erroresCampo, errorAccion, aviso, procesando, clienteSeleccionado,
    abrirCrear, cerrarPanel, seleccionar, siNoHayCambios, handleChange, handleSubmitForm, verClienteInactivo,
    tablaRef, panelRef, tituloPanelRef, guardarRef, disparadorRef,
    // Baja, descarte y reactivación
    dialogoBajaRef, confirmarBajaRef, dialogoDescartarRef, errorBaja, abrirBaja, handleConfirmarBaja,
    descartarCambios, alCerrarDialogo, reactivando, setReactivando, alReactivarCliente,
    // Empresa nueva
    creandoEmpresa, abrirNuevaEmpresa, cerrarNuevaEmpresa, alCrearEmpresa,
    // Sesión
    sesionVencida, setSesionVencida, sesionRef, alVolverAEntrar,
  };
}
