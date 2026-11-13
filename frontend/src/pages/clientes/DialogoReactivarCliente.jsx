import { useRef, useState } from "react";
import { reactivarCliente } from "../../api/clientes";
import { AvisoSesionEnVentana } from "../../components/SesionVencida";
import { Boton, Dialogo, cerrarDialogoDe } from "../../components/ui";

export default function DialogoReactivarCliente({ cliente, onReactivado, onCerrar, onSesionVencida, sesionVencida, onEntrarDeNuevo }) {
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const confirmarRef = useRef(null);

  async function confirmar() {
    setError(null);
    setGuardando(true);
    try {
      await reactivarCliente(cliente.id);
      setGuardando(false);
      onReactivado();
    } catch (err) {
      setGuardando(false);
      if (err.status === 401) onSesionVencida();
      else if (err.status === 403) setError("No tienes permiso para reactivar clientes.");
      else if (err.status === 404) setError("Este cliente ya no existe. Cierra y actualiza la lista.");
      else setError("No pudimos hablar con el servidor. Inténtalo de nuevo.");
    }
  }

  return (
    <Dialogo idTitulo="directorio-reactivar-titulo" titulo="Reactivar cliente" bloqueado={guardando} onCerrar={onCerrar}>
      <div className="dialogo__form">
        <p className="directorio-dialogo__texto">
          ¿Reactivar a <strong>{cliente.nombre}</strong>? Vuelve a la lista de clientes activos y, si tiene usuario,
          podrá iniciar sesión otra vez.
        </p>
        {sesionVencida && <AvisoSesionEnVentana onEntrar={() => onEntrarDeNuevo(confirmarRef.current)} />}
        {error && <p className="dialogo__error" role="alert">{error}</p>}
        <div className="dialogo__acciones">
          <Boton variante="secundario" data-foco-inicial disabled={guardando} onClick={(e) => cerrarDialogoDe(e.currentTarget)}>
            Cancelar
          </Boton>
          <Boton ref={confirmarRef} variante="oscuro" disabled={guardando} onClick={confirmar}>
            {guardando ? "Reactivando…" : "Reactivar"}
          </Boton>
        </div>
      </div>
    </Dialogo>
  );
}
