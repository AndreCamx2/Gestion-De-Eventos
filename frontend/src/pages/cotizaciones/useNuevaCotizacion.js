import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buscarClientes } from "../../api/clientes";
import { listarConceptos } from "../../api/conceptos";
import { obtenerCalendario } from "../../api/calendario";
import { crearCotizacion, editarCotizacion, getCotizacion } from "../../api/cotizaciones";
import { listarMontajes, listarSalonMontajes, listarSalones } from "../../api/salones";
import {
  ERRORES_VACIOS,
  FORM_VACIO,
  PASO_PERSONAS,
  ajustarCantidad,
  ajustarPersonas,
  avisoOcupacion,
  cantidadInicial,
  comoLista,
  esPorPersona,
  formDesdeCotizacion,
  lineasDesdeCotizacion,
  ocupacionDelDia,
  seguirPersonas,
  erroresDeGuardado,
  estadoAforo,
  payloadCotizacion,
  salonesConMontajes,
  tipoDeError,
  totalesCotizacion,
  totalesLinea,
  validarCotizacion,
  vigenciaPorDefecto,
} from "./nuevaCotizacion";

const CATALOGOS_VACIOS = { salones: [], conceptos: [] };

// idEditar: el id de una cotización guardada para editarla (PUT .../edicion/); sin él,
// el formulario arma una nueva. Solo se edita una cotizada: otra da errorCarga "noEditable".
export function useNuevaCotizacion(idEditar = null) {
  const [catalogos, setCatalogos] = useState(CATALOGOS_VACIOS);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [sesionVencida, setSesionVencida] = useState(null);

  const [busqueda, setBusqueda] = useState("");
  const [clientes, setClientes] = useState([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [errorClientes, setErrorClientes] = useState(null);
  const [reintentoClientes, setReintentoClientes] = useState(0);

  const [form, setForm] = useState(FORM_VACIO);
  const [lineas, setLineas] = useState([]);
  const [conceptoElegido, setConceptoElegido] = useState("");
  const [errores, setErrores] = useState(ERRORES_VACIOS);
  const [guardando, setGuardando] = useState(false);
  const [guardada, setGuardada] = useState(null);
  // Al editar: el detalle tal como llegó (número, estado) para la cabecera.
  const [original, setOriginal] = useState(null);
  // Otras cotizaciones del salón ese día: null mientras no hay salón y fecha.
  const [ocupacion, setOcupacion] = useState(null);

  const busquedaRef = useRef(0);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const [salones, montajes, salonMontajes, conceptos, cotizacion] = await Promise.all([
        listarSalones(),
        listarMontajes(),
        listarSalonMontajes(),
        listarConceptos(),
        idEditar != null ? getCotizacion(idEditar) : null,
      ]);
      const listaConceptos = comoLista(conceptos);
      setCatalogos({
        salones: salonesConMontajes(comoLista(salones), comoLista(montajes), comoLista(salonMontajes)),
        conceptos: listaConceptos,
      });
      if (cotizacion) {
        setOriginal(cotizacion);
        // Solo una cotizada (vencida o no) se edita; una bloqueada se libera primero.
        if (cotizacion.estado !== "cotizado") {
          setErrorCarga("noEditable");
          return;
        }
        setForm(formDesdeCotizacion(cotizacion));
        setLineas(lineasDesdeCotizacion(cotizacion, listaConceptos));
      }
    } catch (error) {
      const tipo = error?.status === 404 ? "noExiste" : tipoDeError(error);
      setErrorCarga(tipo);
      if (tipo === "sesion") setSesionVencida("carga");
    } finally {
      setCargando(false);
    }
  }, [idEditar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (form.cliente) return undefined;
    const peticion = ++busquedaRef.current;
    setBuscandoClientes(true);
    const espera = setTimeout(async () => {
      try {
        const data = await buscarClientes(busqueda.trim());
        if (peticion !== busquedaRef.current) return;
        setClientes(comoLista(data));
        setErrorClientes(null);
      } catch (error) {
        if (peticion !== busquedaRef.current) return;
        const tipo = tipoDeError(error);
        setErrorClientes(tipo);
        if (tipo === "sesion") setSesionVencida("clientes");
      } finally {
        if (peticion === busquedaRef.current) setBuscandoClientes(false);
      }
    }, 300);
    return () => clearTimeout(espera);
  }, [busqueda, form.cliente, reintentoClientes]);

  // Disponibilidad: con salón y fecha, se piden las cotizaciones de ese día en el
  // calendario. Si falla, simplemente no se muestra el aviso (el API valida al bloquear).
  const ocupacionRef = useRef(0);
  useEffect(() => {
    const peticion = ++ocupacionRef.current;
    if (!form.salon || !form.fecha_evento) {
      setOcupacion(null);
      return;
    }
    const dia = form.fecha_evento;
    obtenerCalendario({ desde: dia, hasta: dia, salon: form.salon })
      .then((eventos) => {
        if (peticion === ocupacionRef.current) setOcupacion(ocupacionDelDia(comoLista(eventos), idEditar));
      })
      .catch(() => {
        if (peticion === ocupacionRef.current) setOcupacion(null);
      });
  }, [form.salon, form.fecha_evento, idEditar]);

  const salon = useMemo(
    () => catalogos.salones.find((s) => s.id === form.salon) ?? null,
    [catalogos.salones, form.salon],
  );
  const montaje = salon?.montajes.find((m) => m.id === form.montaje) ?? null;
  const aforo = estadoAforo(form.cantidad_personas, montaje?.aforo ?? null);

  const conceptosDisponibles = useMemo(() => {
    if (!salon) return [];
    const elegidos = new Set(lineas.map((l) => l.concepto.id));
    return catalogos.conceptos
      .filter((c) => c.activo && c.sitio === salon.sitio && !elegidos.has(c.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [salon, catalogos.conceptos, lineas]);

  const lineasConTotales = useMemo(
    () =>
      lineas.map((linea) => ({
        ...linea,
        ...totalesLinea(linea.cantidad, linea.concepto.precio, linea.concepto.impuesto_pct),
      })),
    [lineas],
  );
  const totales = useMemo(() => totalesCotizacion(lineas), [lineas]);
  const vigencia = form.validez_oferta || vigenciaPorDefecto(form.fecha_evento);

  function limpiarError(campo) {
    setErrores((prev) => {
      if (!prev.campos[campo]) return prev;
      const { [campo]: _, ...campos } = prev.campos;
      return { ...prev, campos };
    });
  }

  function cambiarCampo(evento) {
    const { name, value } = evento.target;
    limpiarError(name);
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "cantidad_personas") setLineas((prev) => seguirPersonas(prev, value));
  }

  function elegirCliente(cliente) {
    limpiarError("cliente");
    setForm((prev) => ({ ...prev, cliente }));
  }

  function cambiarCliente() {
    setForm((prev) => ({ ...prev, cliente: null }));
  }

  function elegirSalon(idSalon) {
    if (idSalon === form.salon) return;
    const nuevo = catalogos.salones.find((s) => s.id === idSalon);
    limpiarError("salon");
    limpiarError("montaje");
    if (nuevo?.sitio !== salon?.sitio) {
      setLineas([]);
      setConceptoElegido("");
    }
    const unico = nuevo?.montajes.length === 1 ? nuevo.montajes[0].id : null;
    setForm((prev) => ({ ...prev, salon: idSalon, montaje: unico }));
  }

  function elegirMontaje(idMontaje) {
    limpiarError("montaje");
    limpiarError("cantidad_personas");
    setForm((prev) => ({ ...prev, montaje: idMontaje }));
  }

  function cambiarPersonas(delta) {
    limpiarError("cantidad_personas");
    const nuevas = ajustarPersonas(form.cantidad_personas, delta * PASO_PERSONAS);
    setForm((prev) => ({ ...prev, cantidad_personas: nuevas }));
    setLineas((prev) => seguirPersonas(prev, nuevas));
  }

  function agregarConcepto() {
    const concepto = catalogos.conceptos.find((c) => c.id === Number(conceptoElegido));
    if (!concepto) return;
    setLineas((prev) => [
      ...prev,
      { concepto, cantidad: cantidadInicial(concepto, form.cantidad_personas), sigue: esPorPersona(concepto) },
    ]);
    setConceptoElegido("");
    setErrores((prev) => ({ ...prev, general: null }));
  }

  function cambiarCantidad(indice, valor) {
    setLineas((prev) => prev.map((l, i) => (i === indice ? { ...l, cantidad: valor, sigue: false } : l)));
    setErrores((prev) => ({ ...prev, lineas: prev.lineas.map((e, i) => (i === indice ? null : e)) }));
  }

  function sumarCantidad(indice, delta) {
    setLineas((prev) =>
      prev.map((l, i) => (i === indice ? { ...l, cantidad: ajustarCantidad(l.cantidad, delta), sigue: false } : l)),
    );
    setErrores((prev) => ({ ...prev, lineas: prev.lineas.map((e, i) => (i === indice ? null : e)) }));
  }

  function quitarLinea(indice) {
    setLineas((prev) => prev.filter((_, i) => i !== indice));
    setErrores((prev) => ({ ...prev, lineas: prev.lineas.filter((_, i) => i !== indice) }));
  }

  async function enviar() {
    const locales = validarCotizacion(form, lineas, montaje?.aforo ?? null);
    if (locales) {
      setErrores(locales);
      return;
    }
    setErrores(ERRORES_VACIOS);
    setGuardando(true);
    try {
      const payload = payloadCotizacion(form, lineas);
      setGuardada(await (idEditar != null ? editarCotizacion(idEditar, payload) : crearCotizacion(payload)));
    } catch (error) {
      const resultado = erroresDeGuardado(error, lineas.length);
      setErrores(resultado);
      if (resultado.tipo === "sesion") setSesionVencida("guardado");
    } finally {
      setGuardando(false);
    }
  }

  function guardar(evento) {
    evento.preventDefault();
    if (!guardando) enviar();
  }

  function alVolverAEntrar() {
    const motivo = sesionVencida;
    setSesionVencida(null);
    if (motivo === "carga") cargar();
    if (motivo === "clientes") setReintentoClientes((n) => n + 1);
    if (motivo === "guardado") enviar();
  }

  function empezarOtra() {
    setForm(FORM_VACIO);
    setLineas([]);
    setConceptoElegido("");
    setErrores(ERRORES_VACIOS);
    setGuardada(null);
    setBusqueda("");
  }

  return {
    editando: idEditar != null,
    original,
    ocupacion,
    avisoOcupacion: avisoOcupacion(ocupacion),
    cargando,
    errorCarga,
    cargar,
    sesionVencida: Boolean(sesionVencida),
    alVolverAEntrar,
    busqueda,
    setBusqueda,
    clientes,
    buscandoClientes,
    errorClientes,
    form,
    salones: catalogos.salones,
    salon,
    montaje,
    aforo,
    vigencia,
    conceptosDisponibles,
    conceptoElegido,
    setConceptoElegido,
    lineas: lineasConTotales,
    totales,
    errores,
    guardando,
    guardada,
    cambiarCampo,
    elegirCliente,
    cambiarCliente,
    elegirSalon,
    elegirMontaje,
    cambiarPersonas,
    agregarConcepto,
    cambiarCantidad,
    sumarCantidad,
    quitarLinea,
    guardar,
    empezarOtra,
  };
}
