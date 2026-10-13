import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listarClientes } from "../../api/clientes";
import { getCotizaciones } from "../../api/cotizaciones";
import { listarSalones } from "../../api/salones";
import { hoyLocal } from "../../utils/inicioCifras";
import {
  FILTROS_VACIOS,
  consultas,
  hayFiltros,
  mensajeFiltros,
  resumenHistorico,
  tipoDeError,
  unirResultados,
} from "./historico";
import { comoLista } from "./nuevaCotizacion";

export function useHistorico() {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [textoError, setTextoError] = useState(null);
  const [sesionVencida, setSesionVencida] = useState(false);

  const [clientes, setClientes] = useState([]);
  const [salones, setSalones] = useState([]);

  const peticionRef = useRef(0);

  useEffect(() => {
    let vigente = true;
    Promise.allSettled([listarClientes({ incluirInactivos: true }), listarSalones({ incluirInactivos: true })]).then(
      ([deClientes, deSalones]) => {
        if (!vigente) return;
        const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, "es");
        if (deClientes.status === "fulfilled") setClientes(comoLista(deClientes.value).sort(porNombre));
        if (deSalones.status === "fulfilled") setSalones(comoLista(deSalones.value).sort(porNombre));
      },
    );
    return () => {
      vigente = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    const peticion = ++peticionRef.current;
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
      setError("filtros");
      setTextoError("La fecha final no puede ser anterior a la inicial.");
      setCargando(false);
      return;
    }
    setCargando(true);
    setError(null);
    setTextoError(null);
    try {
      const listas = await Promise.all(consultas(filtros).map((consulta) => getCotizaciones(consulta)));
      if (peticion !== peticionRef.current) return;
      setEventos(unirResultados(listas));
    } catch (err) {
      if (peticion !== peticionRef.current) return;
      const tipo = tipoDeError(err);
      setError(tipo);
      if (tipo === "filtros") setTextoError(mensajeFiltros(err));
      if (tipo === "sesion") setSesionVencida(true);
    } finally {
      if (peticion === peticionRef.current) setCargando(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const hoy = useMemo(() => hoyLocal(), [eventos]);
  const resumen = useMemo(() => resumenHistorico(eventos, hoy), [eventos, hoy]);

  function cambiarFiltro(campo, valor) {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  }

  function quitarFiltros() {
    setFiltros(FILTROS_VACIOS);
  }

  function alVolverAEntrar() {
    setSesionVencida(false);
    cargar();
  }

  return {
    filtros,
    cambiarFiltro,
    quitarFiltros,
    hayFiltros: hayFiltros(filtros),
    eventos,
    resumen,
    hoy,
    cargando,
    error,
    textoError,
    cargar,
    clientes,
    salones,
    sesionVencida,
    alVolverAEntrar,
  };
}
