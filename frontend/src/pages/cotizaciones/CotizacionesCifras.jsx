import { millones } from "./cotizaciones";

export default function CotizacionesCifras({ cifras, mes }) {
  const tasa = cifras?.tasa.porcentaje ?? null;

  return (
    <section className="cotizaciones-cifras" aria-label="Resumen de cotizaciones">
      <div className="cotizaciones-cifra">
        <p className="cotizaciones-cifra__etiqueta">Valor vigente</p>
        <p className="cotizaciones-cifra__valor">{cifras ? millones(cifras.valorVigente) : "—"}</p>
        <p className="cotizaciones-cifra__nota">Cotizadas al día y bloqueadas</p>
      </div>
      <div className="cotizaciones-cifra">
        <p className="cotizaciones-cifra__etiqueta">Tasa de cierre</p>
        <p className="cotizaciones-cifra__valor cotizaciones-cifra__valor--verde">
          {tasa === null ? "—" : `${tasa} %`}
        </p>
        <p className="cotizaciones-cifra__nota">
          {cifras && tasa === null ? `Ninguna cotización se ha resuelto en ${mes}` : `Resueltas en ${mes}`}
        </p>
      </div>
      <div className="cotizaciones-cifra">
        <p className="cotizaciones-cifra__etiqueta">Ticket promedio</p>
        <p className="cotizaciones-cifra__valor">{cifras ? millones(cifras.ticketPromedio) : "—"}</p>
        <p className="cotizaciones-cifra__nota">Sin contar canceladas</p>
      </div>
      <div className="cotizaciones-cifra">
        <p className="cotizaciones-cifra__etiqueta">Vencen en 7 días</p>
        <p className="cotizaciones-cifra__valor cotizaciones-cifra__valor--amarillo">
          {cifras ? cifras.vencenPronto : "—"}
        </p>
        <p className="cotizaciones-cifra__nota">Cotizadas aún vigentes</p>
      </div>
    </section>
  );
}
