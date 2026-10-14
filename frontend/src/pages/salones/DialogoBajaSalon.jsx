import { useEffect, useRef, useState } from "react";
import { cambiarActivoSalon } from "../../api/salones";
import { AvisoSesionEnVentana } from "../../components/SesionVencida";
import { AvisoError, Boton, Dialogo, cerrarDialogoDe } from "../../components/ui";
import { textoError } from "../../utils/erroresApi";

// Confirmación "Dar de baja" o "Reactivar" un salón (SGDE-99): PATCH {activo}.
// La baja es lógica: el salón deja de aparecer en el Rack, el Calendario y
// Nueva cotización, y sus cotizaciones se conservan. Con cotizaciones activas el
// API da 409 y su mensaje dice cuántas son: se muestra con AvisoError "conflicto".
// - salon: el que se da de baja (si está activo) o se reactiva (si no).
// - onCambiado(salon): el API respondió; Salones.jsx lo actualiza y la cierra.
// - onSesionVencida(), sesionVencida, onEntrarDeNuevo(boton): aviso dentro de la
//   ventana (SGDE-94).
export default function DialogoBajaSalon({ salon, onCambiado, onCerrar, onSesionVencida, sesionVencida, onEntrarDeNuevo }) {
  const darDeBaja = salon.activo;
  const [conflicto, setConflicto] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const confirmarRef = useRef(null);
  const cancelarRef = useRef(null);

  // Con el 409 desaparece el botón de confirmar, que tenía el foco: pasa a "Cerrar".
  useEffect(() => {
    if (conflicto) cancelarRef.current?.focus();
  }, [conflicto]);

  async function confirmar() {
    setError(null);
    setGuardando(true);
    try {
      const actualizado = await cambiarActivoSalon(salon.id, !darDeBaja);
      setGuardando(false);
      onCambiado(actualizado);
    } catch (err) {
      setGuardando(false);
      if (err.status === 409) setConflicto(textoError(err.body?.detail ?? "El salón tiene cotizaciones activas."));
      else if (err.status === 401) onSesionVencida();
      else if (err.status === 403) setError("No tienes permiso para cambiar salones.");
      else if (err.status === 404) setError("Este salón ya no existe. Cierra y vuelve a cargar la pantalla.");
      else setError("No pudimos hablar con el servidor. Inténtalo de nuevo.");
    }
  }

  return (
    <Dialogo
      idTitulo="salones-baja-titulo"
      titulo={darDeBaja ? "Dar de baja el salón" : "Reactivar el salón"}
      bloqueado={guardando}
      onCerrar={onCerrar}
    >
      <div className="dialogo__form">
        <p className="salones-dialogo__para">
          {darDeBaja ? (
            <>
              ¿Dar de baja <strong>{salon.nombre}</strong>? Dejará de aparecer en el Rack, el Calendario y Nueva
              cotización. Sus cotizaciones y montajes se conservan, y puedes reactivarlo cuando quieras.
            </>
          ) : (
            <>
              ¿Reactivar <strong>{salon.nombre}</strong>? Vuelve a aparecer en el Rack, el Calendario y Nueva
              cotización, con los montajes que tenía.
            </>
          )}
        </p>
        {conflicto && <AvisoError tipo="conflicto" texto={conflicto} nivel="h3" />}
        {sesionVencida && <AvisoSesionEnVentana onEntrar={() => onEntrarDeNuevo(confirmarRef.current)} />}
        {error && <p className="dialogo__error" role="alert">{error}</p>}
        <div className="dialogo__acciones">
          {/* "Cancelar" lleva el foco inicial: la opción segura. */}
          <Boton ref={cancelarRef} variante="secundario" data-foco-inicial disabled={guardando} onClick={(e) => cerrarDialogoDe(e.currentTarget)}>
            {conflicto ? "Cerrar" : "Cancelar"}
          </Boton>
          {!conflicto && (
            <Boton ref={confirmarRef} variante={darDeBaja ? "peligro" : "oscuro"} disabled={guardando} onClick={confirmar}>
              {guardando ? "Guardando…" : darDeBaja ? "Dar de baja" : "Reactivar"}
            </Boton>
          )}
        </div>
      </div>
    </Dialogo>
  );
}
