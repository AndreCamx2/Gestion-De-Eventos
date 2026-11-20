import { useEffect, useMemo, useRef, useState } from "react";
import { historialConcepto } from "../../api/conceptos";
import { Esqueleto } from "../../components/ui";
import { fechaHistorial, formatCOP, variacion } from "./conceptos";
import { useFuncionEstable } from "../../hooks/useFuncionEstable";

// Depende del id y no del objeto: recargar la lista trae objetos nuevos.
export default function HistorialPrecios({ conceptoId, version, sesionVencida, onSesionVencida }) {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [reintento, setReintento] = useState(0);
  const sesionAntesRef = useRef(sesionVencida);

  // onSesionVencida cambia en cada render de Conceptos.jsx: así no repite la petición.
  const avisarSesionVencida = useFuncionEstable(onSesionVencida);

  useEffect(() => {
    let cancelado = false;
    setHistorial([]);
    setError(null);
    setCargando(true);
    historialConcepto(conceptoId)
      .then((data) => {
        if (!cancelado) setHistorial(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (cancelado) return;
        if (err.status === 401) {
          setError("sesion");
          avisarSesionVencida();
        } else {
          setError("servidor");
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [conceptoId, version, reintento, avisarSesionVencida]);

  useEffect(() => {
    const antes = sesionAntesRef.current;
    sesionAntesRef.current = sesionVencida;
    if (antes && !sesionVencida && error === "sesion") setReintento((n) => n + 1);
  }, [sesionVencida, error]);

  const ordenado = useMemo(
    () => [...historial].sort((a, b) => new Date(b.fecha_modificacion) - new Date(a.fecha_modificacion)),
    [historial],
  );

  let contenido;
  if (cargando) {
    contenido = <Esqueleto filas={2} avatar={false} etiqueta="Cargando historial…" />;
  } else if (error === "sesion") {
    contenido = (
      <p className="conceptos-historial__vacio">
        Tu sesión expiró. Vuelve a entrar con el aviso de abajo para ver el historial.
      </p>
    );
  } else if (error) {
    contenido = <p className="conceptos-error">No se pudo cargar el historial de precios.</p>;
  } else if (ordenado.length === 0) {
    contenido = <p className="conceptos-historial__vacio">Sin cambios de precio desde que se creó.</p>;
  } else {
    contenido = (
      <ol className="conceptos-historial__lista">
        {ordenado.map((h) => {
          const v = variacion(h.precio_anterior, h.precio_nuevo);
          return (
            <li key={h.id} className="conceptos-historial__item">
              <span className="conceptos-historial__punto" aria-hidden="true" />
              <div>
                <p className="conceptos-historial__cambio">
                  <s className="conceptos-historial__antes">{formatCOP(h.precio_anterior)}</s>
                  <span aria-hidden="true">→</span>
                  <span className="visually-hidden">pasó a</span>
                  <strong>{formatCOP(h.precio_nuevo)}</strong>
                  {v && (
                    <span
                      className={`conceptos-historial__delta ${v.sube ? "conceptos-historial__delta--sube" : "conceptos-historial__delta--baja"}`}
                    >
                      {v.texto}
                    </span>
                  )}
                </p>
                <p className="conceptos-historial__meta">
                  {fechaHistorial(h.fecha_modificacion)} · por {h.modificado_por}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <section className="conceptos-historial" aria-labelledby="conceptos-historial-titulo">
      <h3 id="conceptos-historial-titulo" className="conceptos-historial__titulo">
        Historial de precios
      </h3>
      {contenido}
    </section>
  );
}
