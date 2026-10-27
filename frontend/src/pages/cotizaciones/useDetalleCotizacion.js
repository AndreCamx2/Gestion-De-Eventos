import { useCallback, useEffect, useRef, useState } from "react";
import { extenderVigencia, getCotizacion, getMovimientos, registrarAceptacion } from "../../api/cotizaciones";
import {
  ACEPTACION_VACIA,
  mensajeAceptacion,
  mensajeVigencia,
  payloadAceptacion,
  tipoDeError,
  validarAceptacion,
  validarVigencia,
} from "./detalleCotizacion";
import { useAnulacion } from "./useAnulacion";
import { useCancelacion } from "./useCancelacion";

export function useDetalleCotizacion(id) {
  const [cotizacion, setCotizacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [sesionVencida, setSesionVencida] = useState(null);

  const [nuevaVigencia, setNuevaVigencia] = useState("");
  const [errorVigencia, setErrorVigencia] = useState(null);
  const [extendiendo, setExtendiendo] = useState(false);
  const [vigenciaExtendida, setVigenciaExtendida] = useState(false);

  const [aceptacion, setAceptacion] = useState(ACEPTACION_VACIA);
  const [errorAceptacion, setErrorAceptacion] = useState(null);
  const [aceptando, setAceptando] = useState(false);
  const [recienConfirmada, setRecienConfirmada] = useState(false);

  const [movimientos, setMovimientos] = useState([]);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(true);
  const [errorMovimientos, setErrorMovimientos] = useState(false);

  const peticionRef = useRef(0);
  const movimientosRef = useRef(0);
  // Para abrir "Entrar de nuevo" desde la ventana de cancelar (SGDE-94).
  const sesionRef = useRef(null);

  const cargarMovimientos = useCallback(async () => {
    const peticion = ++movimientosRef.current;
    if (id == null) return;
    setCargandoMovimientos(true);
    setErrorMovimientos(false);
    try {
      const data = await getMovimientos(id);
      if (peticion !== movimientosRef.current) return;
      setMovimientos(Array.isArray(data) ? data : data?.results ?? []);
    } catch {
      if (peticion === movimientosRef.current) setErrorMovimientos(true);
    } finally {
      if (peticion === movimientosRef.current) setCargandoMovimientos(false);
    }
  }, [id]);

  const cargar = useCallback(async () => {
    const peticion = ++peticionRef.current;
    if (id == null) {
      setErrorCarga("noExiste");
      setCargando(false);
      return;
    }
    setCargando(true);
    setErrorCarga(null);
    try {
      const data = await getCotizacion(id);
      if (peticion !== peticionRef.current) return;
      setCotizacion(data);
      setNuevaVigencia(data.validez_oferta ?? "");
    } catch (error) {
      if (peticion !== peticionRef.current) return;
      const tipo = tipoDeError(error);
      setErrorCarga(tipo);
      if (tipo === "sesion") setSesionVencida("carga");
    } finally {
      if (peticion === peticionRef.current) setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
    cargarMovimientos();
  }, [cargar, cargarMovimientos]);

  const cancelacion = useCancelacion({
    cotizacion,
    onCancelada: (cancelada) => {
      setCotizacion(cancelada);
      cargarMovimientos();
    },
    onRecargar: () => Promise.all([cargar(), cargarMovimientos()]),
    // En la ventana: al volver a entrar, la persona repite "Cancelar evento".
    onSesionVencida: () => setSesionVencida("cancelacion"),
  });

  const anulacion = useAnulacion({
    cotizacion,
    onAnulada: (anulada) => {
      setCotizacion(anulada);
      cargarMovimientos();
    },
    onRecargar: () => Promise.all([cargar(), cargarMovimientos()]),
    onSesionVencida: () => setSesionVencida("anulacion"),
  });

  // Para las acciones que viven en su propio panel (bloquear y liberar): ponen el
  // detalle que respondió el API y se recargan los movimientos.
  function reemplazar(actualizada) {
    setCotizacion(actualizada);
    setNuevaVigencia(actualizada.validez_oferta ?? "");
    cargarMovimientos();
  }

  function cambiarVigencia(valor) {
    setNuevaVigencia(valor);
    setErrorVigencia(null);
    setVigenciaExtendida(false);
  }

  async function enviarVigencia() {
    const local = validarVigencia(nuevaVigencia, cotizacion);
    if (local) {
      setErrorVigencia({ tipo: "datos", texto: local });
      return;
    }
    setExtendiendo(true);
    setErrorVigencia(null);
    try {
      const actualizada = await extenderVigencia(cotizacion.id, nuevaVigencia);
      setCotizacion(actualizada);
      setNuevaVigencia(actualizada.validez_oferta ?? "");
      setVigenciaExtendida(true);
      cargarMovimientos();
    } catch (error) {
      const resultado = mensajeVigencia(error);
      setErrorVigencia(resultado);
      if (resultado.tipo === "sesion") setSesionVencida("vigencia");
    } finally {
      setExtendiendo(false);
    }
  }

  function extender(evento) {
    evento.preventDefault();
    if (!extendiendo) enviarVigencia();
  }

  function cambiarAceptacion(campo, valor) {
    setAceptacion((prev) => ({ ...prev, [campo]: valor }));
    setErrorAceptacion((prev) => {
      if (!prev) return prev;
      const { [campo]: _, ...campos } = prev.campos ?? {};
      const quedan = Object.keys(campos).length > 0 || prev.texto;
      return quedan ? { ...prev, campos } : null;
    });
  }

  async function enviarAceptacion() {
    const local = validarAceptacion(aceptacion, cotizacion);
    if (local) {
      setErrorAceptacion(local);
      return;
    }
    setAceptando(true);
    setErrorAceptacion(null);
    try {
      const confirmada = await registrarAceptacion(cotizacion.id, payloadAceptacion(aceptacion));
      setCotizacion(confirmada);
      setAceptacion(ACEPTACION_VACIA);
      setRecienConfirmada(true);
      cargarMovimientos();
      setVigenciaExtendida(false);
    } catch (error) {
      const resultado = mensajeAceptacion(error);
      setErrorAceptacion(resultado);
      if (resultado.tipo === "sesion") setSesionVencida("aceptacion");
    } finally {
      setAceptando(false);
    }
  }

  function aceptar(evento) {
    evento.preventDefault();
    if (!aceptando) enviarAceptacion();
  }

  function alVolverAEntrar() {
    const motivo = sesionVencida;
    setSesionVencida(null);
    if (motivo === "carga") {
      cargar();
      cargarMovimientos();
    }
    if (motivo === "vigencia") enviarVigencia();
    if (motivo === "aceptacion") enviarAceptacion();
  }

  return {
    cotizacion,
    cargando,
    errorCarga,
    cargar,
    sesionVencida: Boolean(sesionVencida),
    sesionRef,
    alVolverAEntrar,
    nuevaVigencia,
    cambiarVigencia,
    errorVigencia,
    extendiendo,
    vigenciaExtendida,
    extender,
    aceptacion,
    cambiarAceptacion,
    errorAceptacion,
    aceptando,
    recienConfirmada,
    aceptar,
    movimientos,
    cargandoMovimientos,
    errorMovimientos,
    cargarMovimientos,
    cancelacion,
    anulacion,
    reemplazar,
    // Un 401 en un panel: se avisa y, al volver a entrar, la persona repite la acción.
    avisarSesionVencida: () => setSesionVencida("panel"),
  };
}
