import { sumarDias } from "./fechas";

// Días desde hoy con las cotizaciones de cada uno: [{fecha, cotizaciones: [...]}].
export function agruparPorDia(cotizaciones, desde, dias) {
  const porFecha = new Map();
  for (const c of cotizaciones) {
    if (!porFecha.has(c.fecha_evento)) porFecha.set(c.fecha_evento, []);
    porFecha.get(c.fecha_evento).push(c);
  }
  return Array.from({ length: dias }, (_, i) => {
    const fecha = sumarDias(desde, i);
    return { fecha, cotizaciones: porFecha.get(fecha) ?? [] };
  });
}
