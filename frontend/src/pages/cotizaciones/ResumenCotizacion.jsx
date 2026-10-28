import { useState } from "react";
import { Boton } from "../../components/ui";
import { fechaCorta } from "./cotizaciones";
import { pesosDeCentavos } from "./nuevaCotizacion";
import VistaPreviaCotizacion from "./VistaPreviaCotizacion";

const MENSAJES = {
  permiso: "Solo un administrador puede crear cotizaciones.",
  servidor: "No pudimos hablar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  sesion: "Tu sesión expiró. Vuelve a entrar con el aviso de abajo: lo que armaste no se pierde.",
};

function Fila({ etiqueta, children, tono }) {
  return (
    <div className="nc-resumen__fila">
      <dt>{etiqueta}</dt>
      <dd className={tono ? `nc-resumen__valor--${tono}` : undefined}>{children}</dd>
    </div>
  );
}

export default function ResumenCotizacion({ c }) {
  const { totales, errores } = c;
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const mensaje = errores.tipo && errores.tipo !== "datos" && errores.tipo !== "conflicto"
    ? MENSAJES[errores.tipo]
    : errores.general;

  return (
    <aside className="nc-resumen" aria-label="Resumen de la cotización">
      <div className="nc-resumen__total">
        <p className="nc-resumen__total-etiqueta">Total con impuestos</p>
        <p className="nc-resumen__total-valor">{pesosDeCentavos(totales.total)}</p>
      </div>

      <div className="nc-resumen__cuerpo">
        <dl className="nc-resumen__lista">
          <Fila etiqueta="Subtotal">{pesosDeCentavos(totales.subtotal)}</Fila>
          {totales.desglose.length === 0 ? (
            <Fila etiqueta="Impuestos">{pesosDeCentavos(0)}</Fila>
          ) : (
            totales.desglose.map((d) => (
              <Fila key={d.tasa} etiqueta={d.nombre}>{pesosDeCentavos(d.valor)}</Fila>
            ))
          )}
        </dl>

        <hr className="nc-resumen__division" />

        <dl className="nc-resumen__lista nc-resumen__lista--datos">
          <Fila etiqueta="Salón">
            {c.salon ? [c.salon.nombre, c.montaje?.nombre].filter(Boolean).join(" · ") : "—"}
          </Fila>
          <Fila etiqueta="Evento">{c.form.fecha_evento ? fechaCorta(c.form.fecha_evento) : "—"}</Fila>
          <Fila etiqueta="Válida hasta" tono="vigencia">{fechaCorta(c.vigencia)}</Fila>
        </dl>

        {mensaje && (
          <p className={`nc-resumen__aviso nc-resumen__aviso--${errores.tipo ?? "datos"}`} role="alert">
            {mensaje}
          </p>
        )}

        <Boton type="submit" className="nc-resumen__guardar" disabled={c.guardando}>
          {c.guardando ? "Guardando…" : c.editando ? "Guardar cambios" : "Guardar cotización"}
        </Boton>
        <Boton variante="secundario" onClick={() => setVistaPrevia(true)}>
          Vista previa para el cliente
        </Boton>
        <p className="nc-resumen__nota">
          El total final lo calcula el servidor al guardar; aquí se muestra una vista previa.
        </p>
      </div>

      {vistaPrevia && <VistaPreviaCotizacion c={c} onCerrar={() => setVistaPrevia(false)} />}
    </aside>
  );
}
