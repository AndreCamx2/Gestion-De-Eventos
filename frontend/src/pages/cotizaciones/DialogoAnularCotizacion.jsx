import { useEffect, useRef } from "react";
import { AvisoSesionEnVentana } from "../../components/SesionVencida";
import { AvisoError, Boton, Dialogo, cerrarDialogoDe } from "../../components/ui";

// Ventana "Anular cotización" de una cotizada o bloqueada. El estado vive en
// useAnulacion (d.anulacion); la sesión vencida se avisa dentro (SGDE-94).
export default function DialogoAnularCotizacion({ d }) {
  const x = d.anulacion;
  const confirmarRef = useRef(null);
  const volverRef = useRef(null);
  const bloqueada = d.cotizacion.estado === "bloqueado";

  // Con el 409 desaparece "Anular", que tenía el foco: pasa a "Cerrar".
  useEffect(() => {
    if (x.conflicto) volverRef.current?.focus();
  }, [x.conflicto]);

  return (
    <Dialogo idTitulo="dc-anular-titulo" titulo="Anular cotización" bloqueado={x.guardando} onCerrar={x.cerrar}>
      <form className="dialogo__form" onSubmit={x.enviar} noValidate>
        <p className="dc-cancelar__aviso">
          Esta acción no se puede deshacer. La cotización queda cancelada, sin penalización
          {bloqueada ? ", y el salón queda libre ese día" : ""}.
        </p>

        <div className={["campo", x.errorMotivo && "campo--error"].filter(Boolean).join(" ")}>
          <label className="campo__etiqueta" htmlFor="dc-anular-motivo">Motivo</label>
          <textarea
            id="dc-anular-motivo"
            className="campo__input dc-cancelar__motivo"
            rows="3"
            placeholder="Por ejemplo: el cliente eligió otro lugar."
            value={x.motivo}
            onChange={(e) => x.cambiar(e.target.value)}
            aria-invalid={x.errorMotivo ? true : undefined}
            aria-describedby={x.errorMotivo ? "dc-anular-motivo-error" : undefined}
          />
          {x.errorMotivo && <p id="dc-anular-motivo-error" className="campo__error">{x.errorMotivo}</p>}
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
              {x.guardando ? "Anulando…" : "Anular cotización"}
            </Boton>
          )}
        </div>
      </form>
    </Dialogo>
  );
}
