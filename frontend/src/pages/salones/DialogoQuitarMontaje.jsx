import { useEffect, useRef, useState } from "react";
import { quitarMontaje } from "../../api/salones";
import { AvisoSesionEnVentana } from "../../components/SesionVencida";
import { AvisoError, Boton, Dialogo, cerrarDialogoDe } from "../../components/ui";
import { textoError } from "../../utils/erroresApi";

export default function DialogoQuitarMontaje({ salon, habilitado, onQuitado, onCerrar, onSesionVencida, sesionVencida, onEntrarDeNuevo }) {
  const [conflicto, setConflicto] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const confirmarRef = useRef(null);
  const cancelarRef = useRef(null);

  useEffect(() => {
    if (conflicto) cancelarRef.current?.focus();
  }, [conflicto]);

  async function confirmar() {
    setError(null);
    setConflicto(null);
    setGuardando(true);
    try {
      await quitarMontaje(habilitado.id);
      setGuardando(false);
      onQuitado(habilitado.id);
    } catch (err) {
      setGuardando(false);
      if (err.status === 409) setConflicto(textoError(err.body?.detail ?? "Hay cotizaciones activas con este montaje."));
      else if (err.status === 401) onSesionVencida();
      else if (err.status === 403) setError("No tienes permiso para quitar montajes.");
      else if (err.status === 404) setError("Este montaje ya no está habilitado. Cierra y vuelve a cargar la pantalla.");
      else setError("No pudimos hablar con el servidor. Inténtalo de nuevo.");
    }
  }

  return (
    <Dialogo idTitulo="salones-quitar-titulo" titulo="Quitar montaje" bloqueado={guardando} onCerrar={onCerrar}>
      <div className="dialogo__form">
        <p className="salones-dialogo__para">
          ¿Quitar <strong>{habilitado.nombre}</strong> de <strong>{salon.nombre}</strong>? Ya no se podrá cotizar el salón
          en ese montaje. Las cotizaciones pasadas se conservan.
        </p>
        {conflicto && <AvisoError tipo="conflicto" texto={conflicto} nivel="h3" />}
        {sesionVencida && <AvisoSesionEnVentana onEntrar={() => onEntrarDeNuevo(confirmarRef.current)} />}
        {error && <p className="dialogo__error" role="alert">{error}</p>}
        <div className="dialogo__acciones">
          <Boton ref={cancelarRef} variante="secundario" data-foco-inicial disabled={guardando} onClick={(e) => cerrarDialogoDe(e.currentTarget)}>
            {conflicto ? "Cerrar" : "Cancelar"}
          </Boton>
          {!conflicto && (
            <Boton ref={confirmarRef} variante="peligro" disabled={guardando} onClick={confirmar}>
              {guardando ? "Quitando…" : "Quitar"}
            </Boton>
          )}
        </div>
      </div>
    </Dialogo>
  );
}
