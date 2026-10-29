import { useRef, useState } from "react";
import { cambiarEstadoConcepto } from "../../api/conceptos";
import { AvisoSesionEnVentana } from "../../components/SesionVencida";
import { Boton, Dialogo, cerrarDialogoDe } from "../../components/ui";
import { formatCOP } from "./conceptos";

// Ventana para desactivar o reactivar un concepto.
// - activar: true para reactivar, false para desactivar.
// - onHecho(): el cambio quedó guardado; Conceptos.jsx la cierra y recarga.
// - onSesionVencida(), sesionVencida, onEntrarDeNuevo(boton): igual que en
//   DialogoNuevoConcepto. Al volver a entrar, el foco regresa al botón de confirmar.
export default function DialogoEstadoConcepto({
  concepto,
  activar,
  onHecho,
  onCerrar,
  onSesionVencida,
  sesionVencida,
  onEntrarDeNuevo,
}) {
  const [error, setError] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const confirmarRef = useRef(null);
  const accion = activar ? "reactivar" : "desactivar";

  async function confirmar() {
    setError(null);
    setProcesando(true);
    try {
      await cambiarEstadoConcepto(concepto.id, activar);
      setProcesando(false);
      onHecho();
    } catch (err) {
      setProcesando(false);
      if (err.status === 401) {
        // La ventana sigue abierta: al volver a entrar, se confirma de nuevo.
        onSesionVencida();
      } else if (err.status === 403) {
        setError(`No tienes permisos suficientes para ${accion} conceptos.`);
      } else if (err.status === 404) {
        setError("Este concepto ya no existe. Cierra y actualiza la lista.");
      } else {
        setError(`Error inesperado en el servidor al ${accion} el concepto.`);
      }
    }
  }

  return (
    <Dialogo
      idTitulo="conceptos-estado-titulo"
      titulo={activar ? "Reactivar concepto" : "Desactivar concepto"}
      bloqueado={procesando}
      onCerrar={onCerrar}
    >
      <div className="dialogo__form">
        {activar ? (
          <p className="conceptos-dialogo__texto">
            ¿Reactivar <strong>{concepto.nombre}</strong>? Volverá a estar disponible
            para nuevas cotizaciones con su precio actual de {formatCOP(concepto.precio)}.
          </p>
        ) : (
          <p className="conceptos-dialogo__texto">
            ¿Desactivar <strong>{concepto.nombre}</strong>? Dejará de ofrecerse en nuevas
            cotizaciones. El concepto y su historial de precios se conservan, y puedes reactivarlo
            cuando quieras.
          </p>
        )}
        {sesionVencida && <AvisoSesionEnVentana onEntrar={() => onEntrarDeNuevo(confirmarRef.current)} />}
        {error && <p className="conceptos-error" role="alert">{error}</p>}
        <div className="dialogo__acciones">
          <Boton variante="secundario" disabled={procesando} onClick={(e) => cerrarDialogoDe(e.currentTarget)}>
            Cancelar
          </Boton>
          <Boton
            ref={confirmarRef}
            variante={activar ? "oscuro" : "peligro"}
            disabled={procesando}
            onClick={confirmar}
            data-foco-inicial
          >
            {procesando ? "Procesando…" : activar ? "Reactivar" : "Desactivar"}
          </Boton>
        </div>
      </div>
    </Dialogo>
  );
}
