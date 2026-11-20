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

const FUERZA = { cotizado: 1, bloqueado: 2, confirmado: 3 };

export function estadoVisible(cotizacion) {
  return cotizacion.estado === "cotizado" && cotizacion.vencida ? "vencida" : cotizacion.estado;
}

export function ocupaLaFecha(cotizacion) {
  return Object.hasOwn(FUERZA, estadoVisible(cotizacion));
}

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
