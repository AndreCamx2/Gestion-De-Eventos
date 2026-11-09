import { useEffect, useRef } from "react";
import { AvisoSesionEnVentana } from "../../components/SesionVencida";
import { AvisoError, Boton, Campo, Dialogo, cerrarDialogoDe } from "../../components/ui";
import { fechaMinimaAplazamiento } from "./aplazamiento";
import { fechaDelEvento } from "./detalleCotizacion";

// Ventana "Aplazar fecha" de una bloqueada o confirmada. El estado vive en
// useAplazamiento (d.aplazamiento); la sesión vencida se avisa dentro (SGDE-94).
export default function DialogoAplazarFecha({ d }) {
  const c = d.cotizacion;
  const x = d.aplazamiento;
  const confirmarRef = useRef(null);
  const volverRef = useRef(null);
  const errorMotivo = x.errores.motivo;
  const conserva = c.estado === "confirmado" ? "y la garantía" : "y el bloqueo";

  // Con el 409 desaparece "Aplazar fecha", que tenía el foco: pasa a "Cerrar".
  useEffect(() => {
    if (x.conflicto) volverRef.current?.focus();
  }, [x.conflicto]);

  return (
    <Dialogo idTitulo="dc-aplazar-titulo" titulo="Aplazar fecha del evento" bloqueado={x.guardando} onCerrar={x.cerrar}>
      <form className="dialogo__form" onSubmit={x.enviar} noValidate>
        <p className="dc-aplazar__aviso">
          Hoy está para el {fechaDelEvento(c.fecha_evento)}. Se mantienen el salón, los conceptos {conserva}:
          solo cambia el día, y el salón debe estar libre esa fecha.
        </p>

        <Campo
          etiqueta="Fecha nueva"
          id="dc-aplazar-fecha"
          name="fecha_evento"
          type="date"
          min={fechaMinimaAplazamiento(c)}
          value={x.form.fecha}
          onChange={(e) => x.cambiar("fecha", e.target.value)}
          error={x.errores.fecha_evento}
        />

        <div className={["campo", errorMotivo && "campo--error"].filter(Boolean).join(" ")}>
          <label className="campo__etiqueta" htmlFor="dc-aplazar-motivo">Motivo</label>
          <textarea
            id="dc-aplazar-motivo"
            className="campo__input dc-cancelar__motivo"
            rows="3"
            placeholder="Por ejemplo: el cliente movió el congreso."
            value={x.form.motivo}
            onChange={(e) => x.cambiar("motivo", e.target.value)}
            aria-invalid={errorMotivo ? true : undefined}
            aria-describedby={errorMotivo ? "dc-aplazar-motivo-error" : undefined}
          />
          {errorMotivo && <p id="dc-aplazar-motivo-error" className="campo__error">{errorMotivo}</p>}
        </div>

        {x.conflicto && <AvisoError tipo="conflicto" texto={x.conflicto} nivel="h3" />}
        {d.sesionVencida && (
          <AvisoSesionEnVentana onEntrar={() => d.sesionRef.current?.abrir({ focoAlVolver: confirmarRef.current })} />
        )}
        {x.error && <p className="dialogo__error" role="alert">{x.error}</p>}

        <div className="dialogo__acciones">
          <Boton ref={volverRef} variante="secundario" disabled={x.guardando} onClick={(e) => cerrarDialogoDe(e.currentTarget)}>
            {x.conflicto ? "Cerrar" : "Volver"}
          </Boton>
          {!x.conflicto && (
            <Boton ref={confirmarRef} type="submit" disabled={x.guardando}>
              {x.guardando ? "Aplazando…" : "Aplazar fecha"}
            </Boton>
          )}
        </div>
      </form>
    </Dialogo>
  );
}
