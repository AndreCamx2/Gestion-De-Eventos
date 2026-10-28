import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getUsuarioActual } from "../../api/auth";
import { listarSitios } from "../../api/sitios";
import { crearUsuario, listarRoles, listarUsuarios } from "../../api/usuarios";
import {
  NUEVO_VACIO,
  erroresUsuario,
  filtrarUsuarios,
  mensajeError,
  ordenarUsuarios,
  payloadNuevo,
  rolesInternos,
  tipoDeError,
  validarNuevo,
} from "./usuarios";

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sitios, setSitios] = useState([]);
  const [yoId, setYoId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [sesionVencida, setSesionVencida] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const [nuevo, setNuevo] = useState(NUEVO_VACIO);
  const [erroresNuevo, setErroresNuevo] = useState({});
  const [errorNuevo, setErrorNuevo] = useState(null);
  const [creando, setCreando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const [dialogo, setDialogo] = useState(null);
  const disparadorRef = useRef(null);
  const peticionRef = useRef(0);
  const reintentarRef = useRef(null);

  const cargar = useCallback(async () => {
    const peticion = ++peticionRef.current;
    setCargando(true);
    setErrorCarga(null);
    try {
      const [lista, catalogo, misSitios, yo] = await Promise.all([
        listarUsuarios({ incluirInactivos: mostrarInactivos }),
        listarRoles(),
        listarSitios(),
        getUsuarioActual(),
      ]);
      if (peticion !== peticionRef.current) return;
      setUsuarios(lista);
      setRoles(rolesInternos(catalogo));
      setSitios(misSitios);
      setYoId(yo?.id ?? null);
    } catch (error) {
      if (peticion !== peticionRef.current) return;
      const tipo = tipoDeError(error);
      setErrorCarga(tipo);
      if (tipo === "sesion") {
        reintentarRef.current = "carga";
        setSesionVencida(true);
      }
    } finally {
      if (peticion === peticionRef.current) setCargando(false);
    }
  }, [mostrarInactivos]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!nuevo.rol && roles.length) {
      const proveedor = roles.find((r) => r.codigo === "proveedor") ?? roles[0];
      setNuevo((prev) => ({ ...prev, rol: String(proveedor.id) }));
    }
  }, [roles, nuevo.rol]);

  const visibles = useMemo(
    () => ordenarUsuarios(filtrarUsuarios(usuarios, { busqueda, rol: filtroRol })),
    [usuarios, busqueda, filtroRol],
  );

  function cambiarNuevo(campo, valor) {
    setNuevo((prev) => ({ ...prev, [campo]: valor }));
    setErroresNuevo((prev) => ({ ...prev, [campo]: undefined }));
    setAviso(null);
  }

  function alternarSitioNuevo(id) {
    const valor = String(id);
    cambiarNuevo(
      "sitios",
      nuevo.sitios.includes(valor) ? nuevo.sitios.filter((s) => s !== valor) : [...nuevo.sitios, valor],
    );
  }

  async function enviarNuevo() {
    setErrorNuevo(null);
    setAviso(null);
    const locales = validarNuevo(nuevo);
    setErroresNuevo(locales);
    if (Object.keys(locales).length) return;
    setCreando(true);
    try {
      const creado = await crearUsuario(payloadNuevo(nuevo));
      setUsuarios((prev) => [...prev, { is_active: true, first_name: "", last_name: "", last_login: null, ...creado, rol_codigo: roles.find((r) => r.id === creado.rol)?.codigo }]);
      setNuevo({ ...NUEVO_VACIO, rol: nuevo.rol });
      setAviso(`Usuario "${creado.username}" creado. Comparte la contraseña temporal por un medio seguro.`);
    } catch (error) {
      if (error.status === 400) {
        const { campos, general } = erroresUsuario(error.body);
        setErroresNuevo(campos);
        setErrorNuevo(general);
      } else if (error.status === 401) {
        reintentarRef.current = "nuevo";
        setSesionVencida(true);
      } else {
        setErrorNuevo(mensajeError(error.status, "crear usuarios"));
      }
    } finally {
      setCreando(false);
    }
  }

  function crear(evento) {
    evento.preventDefault();
    if (!creando) enviarNuevo();
  }

  function abrirDialogo(tipo, usuario, evento) {
    disparadorRef.current = evento?.currentTarget ?? null;
    setDialogo({ tipo, usuario });
  }

  function cerrarDialogo() {
    setDialogo(null);
    const boton = disparadorRef.current;
    disparadorRef.current = null;
    if (boton?.isConnected) boton.focus();
  }

  function alActualizar(usuario, mensaje) {
    setUsuarios((prev) =>
      mostrarInactivos || usuario.is_active
        ? prev.map((u) => (u.id === usuario.id ? usuario : u))
        : prev.filter((u) => u.id !== usuario.id),
    );
    setAviso(mensaje);
    cerrarDialogo();
  }

  function alVolverAEntrar() {
    setSesionVencida(false);
    const motivo = reintentarRef.current;
    reintentarRef.current = null;
    if (motivo === "carga") cargar();
    if (motivo === "nuevo") enviarNuevo();
  }

  return {
    usuarios,
    visibles,
    roles,
    sitios,
    yoId,
    cargando,
    errorCarga,
    cargar,
    busqueda,
    setBusqueda,
    filtroRol,
    setFiltroRol,
    mostrarInactivos,
    setMostrarInactivos,
    nuevo,
    erroresNuevo,
    errorNuevo,
    creando,
    aviso,
    cambiarNuevo,
    alternarSitioNuevo,
    crear,
    dialogo,
    abrirDialogo,
    cerrarDialogo,
    alActualizar,
    sesionVencida,
    setSesionVencida,
    alVolverAEntrar,
  };
}
