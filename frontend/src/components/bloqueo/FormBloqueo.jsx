import { useId, useState } from "react";
import { bloqueoPorDefecto, datetimeLocalAISO } from "../../utils/fechasBloqueo";
import { Boton, Campo } from "../ui";

export default function FormBloqueo({ cotizacion, error, procesando, onGuardar, onCancelar, guardarRef }) {
  const [valor, setValor] = useState(() => bloqueoPorDefecto(new Date(), cotizacion.fecha_evento));
  const [errorLocal, setErrorLocal] = useState(null);
  const idCampo = useId();

  function enviar(event) {
    event.preventDefault();
    const iso = datetimeLocalAISO(valor);
    if (!iso) {
      setErrorLocal("Escribe la fecha y la hora hasta la que se bloquea.");
      return;
    }
    setErrorLocal(null);
    onGuardar(iso);
  }

  return (
    <form className="form-bloqueo" onSubmit={enviar} noValidate>
      <Campo
        id={idCampo}
        etiqueta="Bloquear hasta"
        type="datetime-local"
        value={valor}
        max={`${cotizacion.fecha_evento}T23:59`}
        onChange={(e) => setValor(e.target.value)}
        error={errorLocal ?? error}
        data-foco-inicial
      />
      <div className="form-bloqueo__acciones">
        <Boton variante="secundario" onClick={onCancelar} disabled={procesando}>
          Cancelar
        </Boton>
        <Boton ref={guardarRef} type="submit" variante="oscuro" disabled={procesando}>
          {procesando ? "Bloqueando…" : "Bloquear"}
        </Boton>
      </div>
    </form>
  );
}
