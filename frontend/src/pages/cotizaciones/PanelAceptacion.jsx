import { Boton } from "../../components/ui";
import { pesos } from "./nuevaCotizacion";
import { TIPOS_GARANTIA, parsearMonto, porcentajeDelTotal } from "./detalleCotizacion";

export default function PanelAceptacion({ d }) {
  const { cotizacion: c, aceptacion: form } = d;
  const error = d.errorAceptacion;
  const campos = error?.campos ?? {};
  const pct = porcentajeDelTotal(parsearMonto(form.monto), c.total);
  const ayudaMonto = pct != null ? `${pct.toLocaleString("es-CO")}% del total (${pesos(c.total)})` : `Total: ${pesos(c.total)}`;

  return (
    <section className="dc-panel dc-panel--aceptacion" aria-labelledby="dc-aceptacion-titulo">
      <h2 id="dc-aceptacion-titulo" className="dc-panel__titulo">Registrar aceptación</h2>
      <p className="dc-panel__texto">
        {c.estado === "bloqueado"
          ? "La fecha está bloqueada para este cliente. Registra la garantía para confirmar el evento."
          : "Cuando el cliente acepte y deje la garantía, regístrala aquí para confirmar el evento."}
      </p>

      <form className="dc-aceptacion" onSubmit={d.aceptar} noValidate>
        <fieldset className="dc-garantias" aria-describedby={campos.tipo ? "dc-error-tipo" : undefined}>
          <legend className="dc-etiqueta">Tipo de garantía</legend>
          <div className="dc-garantias__opciones">
            {TIPOS_GARANTIA.map((t) => (
              <label key={t.valor} className="dc-garantia" data-elegido={form.tipo === t.valor || undefined}>
                <input
                  type="radio"
                  name="dc-garantia"
                  className="visually-hidden"
                  value={t.valor}
                  checked={form.tipo === t.valor}
                  onChange={() => d.cambiarAceptacion("tipo", t.valor)}
                />
                {t.texto}
              </label>
            ))}
          </div>
          {campos.tipo && <p id="dc-error-tipo" className="dc-error">{campos.tipo}</p>}
        </fieldset>

        <div className="dc-monto">
          <label htmlFor="dc-monto" className="dc-etiqueta">Monto recibido</label>
          <div className={["dc-monto__campo", campos.monto && "dc-monto__campo--error"].filter(Boolean).join(" ")}>
            <span className="dc-monto__signo" aria-hidden="true">$</span>
            <input
              id="dc-monto"
              className="dc-monto__input"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={form.monto}
              onChange={(e) => d.cambiarAceptacion("monto", e.target.value)}
              aria-invalid={campos.monto ? true : undefined}
              aria-describedby={campos.monto ? "dc-error-monto dc-ayuda-monto" : "dc-ayuda-monto"}
            />
          </div>
          {campos.monto && <p id="dc-error-monto" className="dc-error">{campos.monto}</p>}
          <p id="dc-ayuda-monto" className="dc-ayuda">{ayudaMonto}</p>
        </div>

        {error?.texto && (
          <p className={`dc-mensaje dc-mensaje--${error.tipo}`} role="alert">
            {error.texto}
          </p>
        )}

        <Boton type="submit" variante="exito" className="dc-aceptacion__boton" disabled={d.aceptando}>
          {d.aceptando ? "Confirmando…" : "Confirmar evento"}
        </Boton>
      </form>
    </section>
  );
}
