import { useEffect, useMemo, useRef, useState } from "react";
import {
  listarClientes,
  crearCliente,
  listarEmpresas,
  actualizarCliente,
  darDeBajaCliente,
} from "../../api/clientes";
import { FORM_VACIO, formDesdeCliente, nitDeEmpresa, erroresDesdeApi, payloadEdicion, validarCliente } from "./formularioCliente";
import { hayDiferencias, normalizar } from "./clientes";
import { useFocoPanel } from "./useFocoPanel";
import { useFuncionEstable } from "../../hooks/useFuncionEstable";

export function useClientes() {
  const [clientes, setClientes] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [sesionVencida, setSesionVencida] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const [panel, setPanel] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [formInicial, setFormInicial] = useState(FORM_VACIO);
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorAccion, setErrorAccion] = useState(null);
  const [errorBaja, setErrorBaja] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [creandoEmpresa, setCreandoEmpresa] = useState(false);
  const [reactivando, setReactivando] = useState(false);
  const abrirAlCargarRef = useRef(null);

  const buscarRef = useRef(null);
  const dialogoBajaRef = useRef(null);
  const confirmarBajaRef = useRef(null);
  const sesionRef = useRef(null);
  const dialogoDescartarRef = useRef(null);
  const disparadorRef = useRef(null);
  const accionPendienteRef = useRef(null);

  const recargar = useFuncionEstable(() => cargarDatos());
  useEffect(() => {
    recargar();
  }, [mostrarInactivos, recargar]);

  const { tablaRef, panelRef, tituloPanelRef, guardarRef, focoPendienteRef } = useFocoPanel(panel);

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

  // Si la acción ya movió el foco, disparadorRef está vacío.
  function alCerrarDialogo() {
    const disparador = disparadorRef.current;
    disparadorRef.current = null;
    if (disparador?.isConnected) disparador.focus();
  }

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

  function verClienteInactivo(id) {
    const cliente = clientes.find((c) => c.id === id);
    if (cliente) siNoHayCambios(() => abrirEditar(cliente));
    else siNoHayCambios(() => { abrirAlCargarRef.current = id; setMostrarInactivos(true); });
  }

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

    const locales = validarCliente(form, { esCrear });
    if (Object.keys(locales).length > 0) {
      setErroresCampo(locales);
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
        const { campos, general } = erroresDesdeApi(err.body);
        setErroresCampo(campos);
        setErrorAccion(general);
      } else if (err.status === 401) {
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
      disparadorRef.current = null;
      dialogoBajaRef.current?.close();
      cerrarPanel();
      await cargarDatos();
    } catch (err) {
      if (err.status === 401) {
        // La confirmación modal sigue abierta y muestra el aviso dentro.
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

  let vistaLista = "tabla";
  if (errorCarga === "permiso" || errorCarga === "servidor") vistaLista = "error";
  else if (clientes.length === 0 && errorCarga === "sesion") vistaLista = "sesion";
  else if (clientes.length === 0 && cargando) vistaLista = "carga";
  else if (clientes.length === 0) vistaLista = "vacio";
  else if (clientesFiltrados.length === 0) vistaLista = "sinCoincidencias";

  function quitarFiltros() {
    setFiltroTipo("todos");
    setBusqueda("");
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
    if (errorCarga === "sesion") cargarDatos();
  }

  return {
    clientes, empresas, cargando, errorCarga, cargarDatos, clientesFiltrados, vistaLista, obtenerIdentificacion,
    filtroTipo, setFiltroTipo, busqueda, setBusqueda, mostrarInactivos, setMostrarInactivos, quitarFiltros, buscarRef,
    panel, form, erroresCampo, errorAccion, aviso, procesando, clienteSeleccionado,
    abrirCrear, cerrarPanel, seleccionar, siNoHayCambios, handleChange, handleSubmitForm, verClienteInactivo,
    tablaRef, panelRef, tituloPanelRef, guardarRef, disparadorRef,
    dialogoBajaRef, confirmarBajaRef, dialogoDescartarRef, errorBaja, abrirBaja, handleConfirmarBaja,
    descartarCambios, alCerrarDialogo, reactivando, setReactivando, alReactivarCliente,
    creandoEmpresa, abrirNuevaEmpresa, cerrarNuevaEmpresa, alCrearEmpresa,
    sesionVencida, setSesionVencida, sesionRef, alVolverAEntrar,
  };
}
