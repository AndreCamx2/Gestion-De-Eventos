import { Boton } from "../../components/ui";
import { fechaCorta } from "./cotizaciones";
import { limitesVigencia } from "./detalleCotizacion";

export default function PanelVigencia({ d }) {
  const { cotizacion: c } = d;
  const { min, max } = limitesVigencia(c);
  const error = d.errorVigencia;

  return (
    <section className="dc-panel" aria-labelledby="dc-vigencia-titulo">
      <h2 id="dc-vigencia-titulo" className="dc-panel__titulo">Vigencia</h2>
      <p className="dc-panel__texto">
        {c.vencida
          ? `Venció el ${fechaCorta(c.validez_oferta)}. Puedes extenderla hasta el día del evento.`
          : "Puedes extenderla aunque ya haya vencido, hasta el día del evento."}
      </p>

      <form className="dc-vigencia" onSubmit={d.extender} noValidate>
        <label className={["dc-vigencia__campo", error?.tipo === "datos" && "dc-vigencia__campo--error"].filter(Boolean).join(" ")}>
          <span className="visually-hidden">Válida hasta</span>
          <input
            type="date"
            className="dc-vigencia__input"
            min={min}
            max={max}
            value={d.nuevaVigencia}
            onChange={(e) => d.cambiarVigencia(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "dc-vigencia-error" : undefined}
          />
        </label>
        <Boton type="submit" variante="oscuro" className="dc-vigencia__boton" disabled={d.extendiendo}>
          {d.extendiendo ? "Guardando…" : "Extender"}
        </Boton>
      </form>

      {error && (
        <p id="dc-vigencia-error" className={`dc-mensaje dc-mensaje--${error.tipo}`} role="alert">
          {error.texto}
        </p>
      )}
      {d.vigenciaExtendida && !error && (
        <p className="dc-mensaje dc-mensaje--exito" role="status">
          Listo: la oferta queda vigente hasta el {fechaCorta(c.validez_oferta)}.
        </p>
      )}
    </section>
  );
}

export function AvisoAceptacionVencida() {
  return (
    <section className="dc-panel dc-panel--bloqueado" aria-labelledby="dc-aceptacion-titulo">
      <h2 id="dc-aceptacion-titulo" className="dc-panel__titulo">Registrar aceptación</h2>
      <p className="dc-panel__texto">
        Esta cotización está vencida: no se puede registrar la aceptación ni confirmar el evento. Extiende la
        vigencia primero.
      </p>
    </section>
  );
}
