import { useCallback, useEffect, useRef, useState } from "react";
import { extenderVigencia, getCotizacion } from "../../api/cotizaciones";
import { mensajeVigencia, tipoDeError, validarVigencia } from "./detalleCotizacion";

export function useDetalleCotizacion(id) {
  const [cotizacion, setCotizacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [sesionVencida, setSesionVencida] = useState(null);

  const [nuevaVigencia, setNuevaVigencia] = useState("");
  const [errorVigencia, setErrorVigencia] = useState(null);
  const [extendiendo, setExtendiendo] = useState(false);
  const [vigenciaExtendida, setVigenciaExtendida] = useState(false);

  const peticionRef = useRef(0);

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
  }, [cargar]);

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

  function alVolverAEntrar() {
    const motivo = sesionVencida;
    setSesionVencida(null);
    if (motivo === "carga") cargar();
    if (motivo === "vigencia") enviarVigencia();
  }

  return {
    cotizacion,
    cargando,
    errorCarga,
    cargar,
    sesionVencida: Boolean(sesionVencida),
    alVolverAEntrar,
    nuevaVigencia,
    cambiarVigencia,
    errorVigencia,
    extendiendo,
    vigenciaExtendida,
    extender,
  };
}
