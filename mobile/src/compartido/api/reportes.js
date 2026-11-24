import { apiFetch } from "./client";

// Reportes del administrador.
//
// GET /api/reportes/ingresos-por-tipo-evento/?desde=AAAA-MM-DD&hasta=AAAA-MM-DD (SGDE-144).
// Solo administrador. Cuenta las cotizaciones CONFIRMADAS de los sitios del
// usuario cuya fecha_evento cae en el periodo, agrupadas por TIPO de evento:
// {
//   "gran_total": "30000000.00",
//   "total_eventos": 6,
//   "ticket_promedio": "5000000.00",
//   "detalle": [              // de mayor a menor ingreso
//     {
//       "tipo_evento_id": 13,           // null para "Sin clasificar"
//       "tipo_evento_nombre": "Boda",
//       "grupo_evento_nombre": "Social",
//       "cantidad_eventos": 2,
//       "ingreso_total": "12000000.00",
//       "porcentaje_ingreso": 40.0
//     }
//   ]
// }
// Los montos llegan como texto. La agrupación por grupo la hace la pantalla
// sumando los tipos de cada grupo (pages/ingresos/ingresos.js).
export function ingresosPorTipoEvento({ desde, hasta } = {}) {
  const params = new URLSearchParams();
  if (desde) params.append("desde", desde);
  if (hasta) params.append("hasta", hasta);
  const query = params.toString();
  return apiFetch(`/reportes/ingresos-por-tipo-evento/${query ? `?${query}` : ""}`, { method: "GET" });
}
