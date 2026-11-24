import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { mensajeDeError } from "../utils/errores";

// Texto para mostrar de cualquier error del API (cliente del celular o módulos compartidos).
export function textoDeError(error, siNoHayPermiso) {
  if (error?.status === 403 && siNoHayPermiso && error.body?.codigo !== "proveedor_sin_vincular") return siNoHayPermiso;
  if (error?.status === 404) return "No encontramos lo que buscabas. Puede que lo hayan borrado.";
  const { general, campos } = mensajeDeError(error);
  return general || Object.values(campos).join(" ") || "No pudimos completar la acción. Intenta de nuevo.";
}

// Carga los datos de una pantalla cada vez que se muestra (al volver de un formulario
// se ven los cambios). `datos` queda en null hasta la primera respuesta.
export function useCarga(cargar, dependencias = []) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [recargando, setRecargando] = useState(false);
  const peticion = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const traer = useCallback(cargar, dependencias);

  const ejecutar = useCallback(async () => {
    const numero = ++peticion.current;
    try {
      const resultado = await traer();
      if (numero !== peticion.current) return;
      setDatos(resultado);
      setError(null);
    } catch (e) {
      if (numero !== peticion.current) return;
      setError(textoDeError(e));
    } finally {
      if (numero === peticion.current) setCargando(false);
    }
  }, [traer]);

  useFocusEffect(
    useCallback(() => {
      ejecutar();
    }, [ejecutar]),
  );

  const recargar = useCallback(async () => {
    setRecargando(true);
    await ejecutar();
    setRecargando(false);
  }, [ejecutar]);

  return { datos, setDatos, error, cargando: cargando && datos === null, recargando, recargar };
}
