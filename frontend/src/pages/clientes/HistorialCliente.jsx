import { EstadoBadge } from "../../components/ui";
import { estadoVisible } from "../../utils/estadosCotizacion";

// "2026-10-01" → "01/10". validez_oferta es una fecha sin hora: se corta el texto
// en vez de usar new Date, que la correría un día por la zona horaria.
function diaMes(fecha) {
  const [, mes, dia] = String(fecha).split("-");
  return `${dia}/${mes}`;
}

// Cotizaciones del cliente en su panel (de los sitios del usuario, SGDE-90).
// Una cotizada con la vigencia pasada se ve como "Vencida" y dice cuándo venció
// (SGDE-95): el API trae vencida y validez_oferta en cada cotización.
export default function HistorialCliente({ cotizaciones }) {
  return (
    <section className="directorio-historial" aria-labelledby="directorio-historial-titulo">
      <h3 id="directorio-historial-titulo" className="directorio-historial__titulo">Cotizaciones</h3>
      {cotizaciones?.length ? (
        <div className="directorio-historial__caja">
          <table className="directorio-historial__tabla">
            <thead>
              <tr>
                <th scope="col">N.º</th>
                <th scope="col">Estado</th>
                <th scope="col">Fecha del evento</th>
                <th scope="col" className="directorio-tabla__num">Personas</th>
              </tr>
            </thead>
            <tbody>
              {cotizaciones.map((q) => {
                const estado = estadoVisible(q);
                return (
                  <tr key={q.id}>
                    <td className="directorio-historial__id">#{q.id}</td>
                    <td>
                      <EstadoBadge estado={estado} />
                      {estado === "vencida" && q.validez_oferta && (
                        <span className="directorio-historial__vencio">Venció el {diaMes(q.validez_oferta)}</span>
                      )}
                    </td>
                    <td>{q.fecha_evento || "—"}</td>
                    <td className="directorio-tabla__num">{q.cantidad_personas ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="directorio-historial__vacio">Este cliente aún no tiene cotizaciones.</p>
      )}
    </section>
  );
}
