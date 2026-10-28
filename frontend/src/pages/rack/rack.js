// Rack de salones (SGDE-69): funciones puras para armar la rejilla salones × días.
// Si una celda se ve rara en pantalla, la regla está aquí.
import { fechaISO, fechaLarga, sumarDias } from "../../utils/inicioCifras";
import { ETIQUETAS, estadoMasFuerte, ocupaLaFecha } from "../../utils/estadosCotizacion";

export const DIAS_POR_PAGINA = 14;

const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

// Abreviatura visible en la celda: el color nunca es lo único que distingue el estado.
export const ABREVIATURAS = { cotizado: "Cot.", bloqueado: "Bloq.", confirmado: "Conf." };

// `cantidad` días seguidos desde `inicio` (Date local, sin hora).
export function rangoDeDias(inicio, cantidad = DIAS_POR_PAGINA) {
  return Array.from({ length: cantidad }, (_, i) => sumarDias(inicio, i));
}

export function encabezadoDia(fecha) {
  return { semana: DIAS_CORTOS[fecha.getDay()], numero: fecha.getDate() };
}

export function esFinDeSemana(fecha) {
  return fecha.getDay() === 0 || fecha.getDay() === 6;
}

// salones × días → { [salonId]: { [AAAA-MM-DD]: celda } }, con
// celda = { estado, cantidad, cotizaciones }:
// - cotizaciones: TODAS las de ese salón y día (también las vencidas, para el panel);
// - estado: el más fuerte entre las que ocupan la fecha, o "disponible";
// - cantidad: cuántas ocupan la fecha (una vencida no ocupa).
// Las cotizaciones de salones que no están en la lista (por ejemplo, dados de baja) se ignoran.
export function armarRejilla(salones, cotizaciones, dias) {
  const rejilla = {};
  for (const salon of salones) {
    rejilla[salon.id] = {};
    for (const dia of dias) rejilla[salon.id][fechaISO(dia)] = [];
  }
  for (const cotizacion of cotizaciones) {
    rejilla[cotizacion.salon]?.[cotizacion.fecha_evento]?.push(cotizacion);
  }
  for (const porDia of Object.values(rejilla)) {
    for (const [fecha, lista] of Object.entries(porDia)) {
      porDia[fecha] = {
        estado: estadoMasFuerte(lista),
        cantidad: lista.filter(ocupaLaFecha).length,
        cotizaciones: lista,
      };
    }
  }
  return rejilla;
}

// "Salón Bolívar, martes 14 de octubre: bloqueado, 2 cotizaciones" (aria-label de la celda).
export function etiquetaCelda(salonNombre, fecha, celda) {
  const estado = ETIQUETAS[celda.estado].toLowerCase();
  const cuantas = celda.cantidad > 1 ? `, ${celda.cantidad} cotizaciones` : "";
  return `${salonNombre}, ${fechaLarga(fecha).toLowerCase()}: ${estado}${cuantas}`;
}
