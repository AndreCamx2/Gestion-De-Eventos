import { useEffect, useRef } from "react";
import { AvisoSesionEnVentana } from "../../components/SesionVencida";
import { AvisoError, Boton, Dialogo, cerrarDialogoDe } from "../../components/ui";
import { pesos } from "./nuevaCotizacion";
import { montoRetenido, parsearPorcentaje } from "./cancelacion";

// Ventana "Cancelar evento" de un evento confirmado (SGDE-68). El estado vive en
// useCancelacion (d.cancelacion); la sesión vencida se avisa dentro (SGDE-94).
// - d: lo que devuelve useDetalleCotizacion.
export default function DialogoCancelarEvento({ d }) {
  const c = d.cotizacion;
  const x = d.cancelacion;
  const confirmarRef = useRef(null);
  const volverRef = useRef(null);
  const retenido = montoRetenido(c.total, parsearPorcentaje(x.form.penalizacion));
  const errorPct = x.errores.penalizacion_pct;
  const errorMotivo = x.errores.motivo;

  // Con el 409 desaparece "Cancelar evento", que tenía el foco: pasa a "Cerrar".
  useEffect(() => {
    if (x.conflicto) volverRef.current?.focus();
  }, [x.conflicto]);

  return (
    <Dialogo idTitulo="dc-cancelar-titulo" titulo="Cancelar evento" bloqueado={x.guardando} onCerrar={x.cerrar}>
      <form className="dialogo__form" onSubmit={x.enviar} noValidate>
        <p className="dc-cancelar__aviso">
          Esta acción no se puede deshacer. El salón queda libre ese día.
        </p>

        <div className={["campo", errorPct && "campo--error"].filter(Boolean).join(" ")}>
          <label className="campo__etiqueta" htmlFor="dc-cancelar-pct">Penalización (%)</label>
          <input
            id="dc-cancelar-pct"
            className="campo__input dc-cancelar__pct"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0 a 100"
            value={x.form.penalizacion}
            onChange={(e) => x.cambiar("penalizacion", e.target.value)}
            aria-invalid={errorPct ? true : undefined}
            aria-describedby={errorPct ? "dc-cancelar-pct-error dc-cancelar-retenido" : "dc-cancelar-retenido"}
          />
          {errorPct && <p id="dc-cancelar-pct-error" className="campo__error">{errorPct}</p>}
          <p id="dc-cancelar-retenido" className="dc-cancelar__retenido" aria-live="polite">
            {retenido != null ? (
              <>Se retienen <strong>{pesos(retenido)}</strong> de {pesos(c.total)}</>
            ) : (
              <>Total del evento: {pesos(c.total)}</>
            )}
          </p>
        </div>

        <div className={["campo", errorMotivo && "campo--error"].filter(Boolean).join(" ")}>
          <label className="campo__etiqueta" htmlFor="dc-cancelar-motivo">Motivo</label>
          <textarea
            id="dc-cancelar-motivo"
            className="campo__input dc-cancelar__motivo"
            rows="3"
            value={x.form.motivo}
            onChange={(e) => x.cambiar("motivo", e.target.value)}
            aria-invalid={errorMotivo ? true : undefined}
            aria-describedby={errorMotivo ? "dc-cancelar-motivo-error" : undefined}
          />
          {errorMotivo && <p id="dc-cancelar-motivo-error" className="campo__error">{errorMotivo}</p>}
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
            <Boton ref={confirmarRef} type="submit" variante="peligro" disabled={x.guardando}>
              {x.guardando ? "Cancelando…" : "Cancelar evento"}
            </Boton>
          )}
        </div>
      </form>
    </Dialogo>
  );
}
