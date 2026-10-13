// Calendario de disponibilidad (SGDE-45): funciones puras para armar el mes.
// Si un día se ve raro en pantalla, la regla está aquí.
import { estadoVisible, ocupaLaFecha } from "../../utils/estadosCotizacion";
import { fechaHoraColombia } from "../../utils/fechasBloqueo";
import { desdeISO, fechaLarga, nombreMes, sumarDias } from "../../utils/inicioCifras";

export const DIAS_EN_CUADRICULA = 42; // 6 semanas
export const MAX_PILDORAS = 3;
export const ENCABEZADOS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

// Orden en que se nombran los estados de un día (aria-label y puntos del teléfono).
const ORDEN_ESTADOS = ["confirmado", "bloqueado", "cotizado"];

const dos = (n) => String(n).padStart(2, "0");

// ---- El mes: se maneja como texto "AAAA-MM" -------------------------------
// Un texto (y no un Date) no cambia de identidad entre renders: el efecto que
// pide los datos solo corre cuando de verdad cambia el mes.

export function claveMes(fecha) {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}`;
}

// "?mes=2026-11" → "2026-11"; cualquier otra cosa ("2026-13", "nov", null) → null.
export function leerMes(texto) {
  const partes = /^(\d{4})-(\d{2})$/.exec(texto ?? "");
  if (!partes) return null;
  const mes = Number(partes[2]);
  return mes >= 1 && mes <= 12 ? texto : null;
}

export function primerDia(clave) {
  const [anio, mes] = clave.split("-").map(Number);
  return new Date(anio, mes - 1, 1);
}

export function sumarMeses(clave, cantidad) {
  const fecha = primerDia(clave);
  return claveMes(new Date(fecha.getFullYear(), fecha.getMonth() + cantidad, 1));
}

// "2026-11" → "Noviembre 2026"
export function tituloMes(clave) {
  const fecha = primerDia(clave);
  const nombre = nombreMes(fecha);
  return `${nombre[0].toUpperCase()}${nombre.slice(1)} ${fecha.getFullYear()}`;
}

// Los 42 días de la cuadrícula: desde el lunes de la semana en que empieza el mes.
export function diasDelMes(clave) {
  const primero = primerDia(clave);
  const desdeLunes = (primero.getDay() + 6) % 7; // getDay(): 0 = domingo
  const inicio = sumarDias(primero, -desdeLunes);
  return Array.from({ length: DIAS_EN_CUADRICULA }, (_, i) => sumarDias(inicio, i));
}

// Día seleccionado al abrir un mes: hoy si está en ese mes; si no, el día 1.
export function diaPorDefecto(clave, hoy) {
  return claveMes(hoy) === clave ? hoy : primerDia(clave);
}

// ---- Cotizaciones por día ---------------------------------------------------

// { "AAAA-MM-DD": [cotizaciones] }, solo de los salones de `idsSalones` (Set).
// Incluye las vencidas: el panel las muestra aunque no ocupen la fecha.
export function agruparPorDia(cotizaciones, idsSalones) {
  const porDia = {};
  for (const c of cotizaciones) {
    if (!idsSalones.has(c.salon)) continue;
    (porDia[c.fecha_evento] ??= []).push(c);
  }
  for (const lista of Object.values(porDia)) {
    lista.sort((a, b) => a.salon_nombre.localeCompare(b.salon_nombre, "es") || a.id - b.id);
  }
  return porDia;
}

// Píldoras de un día: solo las que ocupan la fecha (una vencida no), hasta `max`,
// y cuántas quedan para el "+N más".
export function pildorasDelDia(lista = [], max = MAX_PILDORAS) {
  const ocupan = lista.filter(ocupaLaFecha);
  return { visibles: ocupan.slice(0, max), restantes: Math.max(ocupan.length - max, 0) };
}

// Estados distintos que ocupan el día, del más fuerte al más débil.
export function estadosDelDia(lista = []) {
  const presentes = new Set(lista.filter(ocupaLaFecha).map((c) => c.estado));
  return ORDEN_ESTADOS.filter((e) => presentes.has(e));
}

function enumerar(palabras) {
  if (palabras.length <= 1) return palabras.join("");
  return `${palabras.slice(0, -1).join(", ")} y ${palabras.at(-1)}`;
}

// Nombre del salón en la píldora: sin el "Salón " del principio, que no cabe y se
// repite en todas ("Salón Bolívar" → "Bolívar"). El aria-label y el panel usan el completo.
export function nombreEnPildora(nombre) {
  return nombre.replace(/^sal[oó]n\s+/i, "") || nombre;
}

// "20 de noviembre"
export function diaYMes(fecha) {
  return `${fecha.getDate()} de ${nombreMes(fecha)}`;
}

// "VIERNES" (antetítulo del panel)
export function diaDeLaSemana(fecha) {
  return fechaLarga(fecha).split(" ")[0].toUpperCase();
}

// aria-label del día: "20 de noviembre: 2 eventos, confirmado y cotizado".
// Cuenta lo mismo que las píldoras: solo lo que ocupa la fecha.
export function etiquetaDia(fecha, lista = [], esHoy = false) {
  const nombre = `${diaYMes(fecha)}${esHoy ? " (hoy)" : ""}`;
  const cantidad = lista.filter(ocupaLaFecha).length;
  if (cantidad === 0) return `${nombre}: sin eventos`;
  const eventos = cantidad === 1 ? "1 evento" : `${cantidad} eventos`;
  return `${nombre}: ${eventos}, ${enumerar(estadosDelDia(lista))}`;
}

// "2026-10-13" → "13/10"
export function fechaCorta(iso) {
  const fecha = desdeISO(iso);
  return `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}`;
}

// Línea de estado de una cotización en el panel, con texto (no solo color).
// Devuelve { estado, texto }; texto es null si no hay nada que agregar.
export function notaCotizacion(c) {
  const estado = estadoVisible(c);
  if (estado === "bloqueado" && c.bloqueo_hasta) {
    return { estado, texto: `Bloqueada hasta ${fechaHoraColombia(c.bloqueo_hasta)}` };
  }
  if (estado === "cotizado" && c.validez_oferta) return { estado, texto: `Vence el ${fechaCorta(c.validez_oferta)}` };
  if (estado === "vencida" && c.validez_oferta) return { estado, texto: `Venció el ${fechaCorta(c.validez_oferta)}` };
  if (estado === "confirmado") return { estado, texto: "Confirmada" };
  return { estado, texto: null };
}

