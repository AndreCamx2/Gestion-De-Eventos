// Funciones de la pantalla de Cotizaciones que no usan estado: formatos, la
// vigencia de cada fila y las cifras de arriba. Las fechas y la tasa de cierre
// vienen de inicioCifras.js, para que el Inicio y esta pantalla digan lo mismo.
import { desdeISO, diasEntre, mesCorto, tasaDeCierre } from "../inicioCifras";

const formatoPesos = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const formatoMillones = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

export const FILTROS = [
  { clave: "todas", texto: "Todas" },
  { clave: "cotizado", texto: "Cotizadas" },
  { clave: "vencida", texto: "Vencidas" },
  { clave: "bloqueado", texto: "Bloqueadas" },
  { clave: "confirmado", texto: "Confirmadas" },
  { clave: "cancelado", texto: "Canceladas" },
];

// "AAAA-MM-DD" → "20 nov 2026" (o "20 nov" sin el año).
export function fechaCorta(texto, conAnio = true) {
  const f = desdeISO(texto);
  return `${f.getDate()} ${mesCorto(f)}${conAnio ? ` ${f.getFullYear()}` : ""}`;
}

export function pesos(valor) {
  return `$ ${formatoPesos.format(Math.round(valor))}`;
}

export function millones(valor) {
  return `$ ${formatoMillones.format(valor / 1e6)} M`;
}

export function numeroCotizacion(id) {
  return `#${String(id).padStart(3, "0")}`;
}

// Minúsculas y sin tildes, para buscar "maria" y encontrar "María".
export function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// El backend no guarda "vencida": es una cotizada cuya oferta ya venció.
export function estadoVisible(c) {
  return c.vencida ? "vencida" : c.estado;
}

// Columna "Vigencia": la fecha, una nota debajo y su tono (clase cotizaciones-vigencia--{tono}).
//   - cotizado: validez_oferta, "vence en N días" / "venció hace N días";
//   - bloqueado con bloqueo_hasta: esa fecha y "bloqueado hasta el {día}";
//     sin bloqueo_hasta, igual que una cotizada;
//   - confirmado: "—" y "garantía recibida" si hay garantía;
//   - cancelado: "—" sin nota.
export function vigencia(c, hoy) {
  if (c.estado === "confirmado") {
    return { fecha: "—", nota: c.garantia ? "garantía recibida" : "", tono: "confirmado" };
  }
  if (c.estado === "bloqueado" && c.bloqueo_hasta) {
    // Fecha con hora ("2026-10-15T18:00:00-05:00"): new Date respeta la zona que
    // trae y getDate() la pasa a la hora local. No se corta como texto.
    const hasta = new Date(c.bloqueo_hasta);
    if (!Number.isNaN(hasta.getTime())) {
      return {
        fecha: `${hasta.getDate()} ${mesCorto(hasta)}`,
        nota: `bloqueado hasta el ${hasta.getDate()}`,
        tono: "bloqueado",
      };
    }
  }
  if ((c.estado !== "cotizado" && c.estado !== "bloqueado") || !c.validez_oferta) {
    return { fecha: "—", nota: "", tono: "neutro" };
  }
  const dias = diasEntre(hoy, desdeISO(c.validez_oferta));
  const fecha = fechaCorta(c.validez_oferta, false);
  if (c.vencida || dias < 0) {
    const pasados = Math.max(1, -dias);
    return { fecha, nota: `venció hace ${pasados} ${pasados === 1 ? "día" : "días"}`, tono: "vencida" };
  }
  if (dias === 0) return { fecha, nota: "vence hoy", tono: "pronto" };
  return {
    fecha,
    nota: `vence en ${dias} ${dias === 1 ? "día" : "días"}`,
    tono: dias <= 7 ? "pronto" : "neutro",
  };
}

// Cifras de arriba, sobre TODAS las cotizaciones: Cotizaciones.jsx le pasa la
// lista sin filtro de fechas (los filtros solo afectan la tabla).
export function resumen(cotizaciones, hoy) {
  const vigentes = cotizaciones.filter(
    (c) => (c.estado === "cotizado" && !c.vencida) || c.estado === "bloqueado",
  );
  const noCanceladas = cotizaciones.filter((c) => c.estado !== "cancelado");
  const totalNoCanceladas = noCanceladas.reduce((suma, c) => suma + Number(c.total || 0), 0);
  return {
    valorVigente: vigentes.reduce((suma, c) => suma + Number(c.total || 0), 0),
    tasa: tasaDeCierre(cotizaciones, hoy),
    ticketPromedio: noCanceladas.length ? totalNoCanceladas / noCanceladas.length : 0,
    vencenPronto: cotizaciones.filter(
      (c) =>
        c.estado === "cotizado" &&
        !c.vencida &&
        c.validez_oferta &&
        diasEntre(hoy, desdeISO(c.validez_oferta)) <= 7,
    ).length,
  };
}

// Error del API → qué mostrar: "sesion" (401), "permiso" (403), "fechas" (400,
// fechas del filtro no válidas) o "servidor" (500 o sin red).
export function tipoDeError(err) {
  if (err?.status === 401) return "sesion";
  if (err?.status === 403) return "permiso";
  if (err?.status === 400) return "fechas";
  return "servidor";
}

// Cuántas cotizaciones hay en cada botón de estado (de la lista de la tabla).
export function conteosPorEstado(cotizaciones) {
  const mapa = { todas: cotizaciones.length };
  cotizaciones.forEach((c) => {
    const clave = estadoVisible(c);
    mapa[clave] = (mapa[clave] ?? 0) + 1;
  });
  return mapa;
}
