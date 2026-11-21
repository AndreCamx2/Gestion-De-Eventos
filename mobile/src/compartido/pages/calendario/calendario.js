import { estadoVisible, ocupaLaFecha } from "../../utils/estadosCotizacion";
import { fechaHoraColombia } from "../../utils/fechasBloqueo";
import { desdeISO, fechaLarga, nombreMes, sumarDias } from "../../utils/inicioCifras";

export const DIAS_EN_CUADRICULA = 42;
export const MAX_PILDORAS = 3;
export const ENCABEZADOS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

const ORDEN_ESTADOS = ["confirmado", "bloqueado", "cotizado"];

const dos = (n) => String(n).padStart(2, "0");

// Un texto (y no un Date) no cambia de identidad entre renders: el efecto que
// pide los datos solo corre cuando de verdad cambia el mes.

export function claveMes(fecha) {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}`;
}

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

export function tituloMes(clave) {
  const fecha = primerDia(clave);
  const nombre = nombreMes(fecha);
  return `${nombre[0].toUpperCase()}${nombre.slice(1)} ${fecha.getFullYear()}`;
}

export function diasDelMes(clave) {
  const primero = primerDia(clave);
  const desdeLunes = (primero.getDay() + 6) % 7;
  const inicio = sumarDias(primero, -desdeLunes);
  return Array.from({ length: DIAS_EN_CUADRICULA }, (_, i) => sumarDias(inicio, i));
}

export function diaPorDefecto(clave, hoy) {
  return claveMes(hoy) === clave ? hoy : primerDia(clave);
}

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

export function pildorasDelDia(lista = [], max = MAX_PILDORAS) {
  const ocupan = lista.filter(ocupaLaFecha);
  return { visibles: ocupan.slice(0, max), restantes: Math.max(ocupan.length - max, 0) };
}

export function estadosDelDia(lista = []) {
  const presentes = new Set(lista.filter(ocupaLaFecha).map((c) => c.estado));
  return ORDEN_ESTADOS.filter((e) => presentes.has(e));
}

function enumerar(palabras) {
  if (palabras.length <= 1) return palabras.join("");
  return `${palabras.slice(0, -1).join(", ")} y ${palabras.at(-1)}`;
}

export function nombreEnPildora(nombre) {
  return nombre.replace(/^sal[oó]n\s+/i, "") || nombre;
}

export function diaYMes(fecha) {
  return `${fecha.getDate()} de ${nombreMes(fecha)}`;
}

export function diaDeLaSemana(fecha) {
  return fechaLarga(fecha).split(" ")[0].toUpperCase();
}

export function etiquetaDia(fecha, lista = [], esHoy = false) {
  const nombre = `${diaYMes(fecha)}${esHoy ? " (hoy)" : ""}`;
  const cantidad = lista.filter(ocupaLaFecha).length;
  if (cantidad === 0) return `${nombre}: sin eventos`;
  const eventos = cantidad === 1 ? "1 evento" : `${cantidad} eventos`;
  return `${nombre}: ${eventos}, ${enumerar(estadosDelDia(lista))}`;
}

export function fechaCorta(iso) {
  const fecha = desdeISO(iso);
  return `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}`;
}

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

