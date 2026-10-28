// Estados de una cotización en pantalla: etiquetas, cuál pesa más y cuáles ocupan
// la fecha. Un solo lugar para EstadoBadge, LeyendaEstados, el Rack (SGDE-69) y
// el Calendario (SGDE-45). Funciones puras, sin React.
//
// El backend solo guarda cotizado, bloqueado, confirmado o cancelado. "vencida"
// (cotizada con la vigencia pasada) y "disponible" (día sin cotizaciones que
// ocupen) son estados de pantalla.

export const ETIQUETAS = {
  disponible: "Disponible",
  cotizado: "Cotizado",
  bloqueado: "Bloqueado",
  confirmado: "Confirmado",
  vencida: "Vencida",
  cancelado: "Cancelado",
};

// Cuál gana cuando hay varias cotizaciones el mismo día en el mismo salón.
const FUERZA = { cotizado: 1, bloqueado: 2, confirmado: 3 };

// El estado que se pinta: una cotizada vencida se ve como "vencida".
export function estadoVisible(cotizacion) {
  return cotizacion.estado === "cotizado" && cotizacion.vencida ? "vencida" : cotizacion.estado;
}

// ¿Ocupa la fecha del salón? Una vencida o una cancelada no la ocupan.
export function ocupaLaFecha(cotizacion) {
  return Object.hasOwn(FUERZA, estadoVisible(cotizacion));
}

// El estado más fuerte (confirmado > bloqueado > cotizado) entre las que ocupan
// la fecha; "disponible" si ninguna la ocupa.
export function estadoMasFuerte(cotizaciones) {
  let ganador = "disponible";
  for (const cotizacion of cotizaciones) {
    if (!ocupaLaFecha(cotizacion)) continue;
    if (ganador === "disponible" || FUERZA[cotizacion.estado] > FUERZA[ganador]) {
      ganador = cotizacion.estado;
    }
  }
  return ganador;
}
