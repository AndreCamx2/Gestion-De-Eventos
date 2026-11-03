import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ingresosPorTipoEvento } from "../../api/reportes";
import { fechasDelPeriodo, leerIngresos, mensajeFiltros, problemaDelRango, tipoDeError } from "./ingresos";

// Estado de la pantalla de Ingresos (SGDE-145): agrupación, periodo y datos.
export function useIngresos() {
  const [agrupar, setAgrupar] = useState("grupo");
  const [periodo, setPeriodo] = useState("mes");
  const [rango, setRango] = useState({ desde: "", hasta: "" });
  const [respuesta, setRespuesta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [textoError, setTextoError] = useState(null);
  const [sesionVencida, setSesionVencida] = useState(false);
  const peticionRef = useRef(0);

  const cargar = useCallback(async () => {
    const peticion = ++peticionRef.current;
    const problema = problemaDelRango(periodo, rango);
    if (problema) {
      setRespuesta(null);
      setError("filtros");
      setTextoError(problema);
      setCargando(false);
      return;
    }
    setCargando(true);
    setError(null);
    setTextoError(null);
    try {
      const datosApi = await ingresosPorTipoEvento(fechasDelPeriodo(periodo, rango));
      if (peticion !== peticionRef.current) return;
      setRespuesta(datosApi);
    } catch (err) {
      if (peticion !== peticionRef.current) return;
      const tipo = tipoDeError(err);
      setError(tipo);
      if (tipo === "filtros") setTextoError(mensajeFiltros(err));
      if (tipo === "sesion") setSesionVencida(true);
    } finally {
      if (peticion === peticionRef.current) setCargando(false);
    }
  }, [periodo, rango]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Cambiar "Ver por" no vuelve a llamar al API: solo reagrupa lo que ya llegó.
  const datos = useMemo(() => leerIngresos(respuesta, agrupar), [respuesta, agrupar]);

  function cambiarRango(campo, valor) {
    setRango((prev) => ({ ...prev, [campo]: valor }));
  }

  function alVolverAEntrar() {
    setSesionVencida(false);
    cargar();
  }

  return {
    agrupar,
    setAgrupar,
    periodo,
    setPeriodo,
    rango,
    cambiarRango,
    datos,
    cargando,
    error,
    textoError,
    cargar,
    sesionVencida,
    alVolverAEntrar,
  };
}
