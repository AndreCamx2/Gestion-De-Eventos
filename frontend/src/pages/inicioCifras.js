// Cifras del Inicio del administrador (SGDE-77): fechas, formatos y fórmulas.
// Son funciones puras: reciben las listas del API y devuelven números o textos.
// Si una cifra se ve rara en pantalla, la fórmula está aquí.

const MS_POR_DIA = 24 * 60 * 60 * 1000;

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// ---- Fechas -------------------------------------------------------------
// Todo en la fecha LOCAL del navegador. No se usa toISOString(): trabaja en UTC
// y después de las 7 p. m. en Colombia ya devuelve la fecha de mañana.

export function hoyLocal() {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

export function sumarDias(fecha, dias) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
}

// Date → "AAAA-MM-DD" (lo que esperan ?desde y ?hasta del API).
export function fechaISO(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

// "AAAA-MM-DD" del API → Date local. new Date("2026-10-12") la leería en UTC.
export function desdeISO(texto) {
  const [anio, mes, dia] = String(texto).split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

// Días enteros de `desde` a `hasta` (negativo si `hasta` ya pasó).
export function diasEntre(desde, hasta) {
  return Math.round((hasta - desde) / MS_POR_DIA);
}

// "Sábado 10 de octubre"
export function fechaLarga(fecha) {
  const dia = DIAS_SEMANA[fecha.getDay()];
  return `${dia[0].toUpperCase()}${dia.slice(1)} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

export function nombreMes(fecha) {
  return MESES[fecha.getMonth()];
}

export function mesCorto(fecha) {
  return MESES_CORTOS[fecha.getMonth()];
}

export function saludoPorHora(hora) {
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

// ---- Números y dinero ------------------------------------------------------

const enteros = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const unDecimal = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

export function numero(valor) {
  return enteros.format(valor);
}

// "$ 184.600.000" (sin centavos).
export function dineroCompleto(valor) {
  return `$ ${enteros.format(valor)}`;
}

// Desde un millón: "$ 184,6 M" (como la maqueta). Por debajo, la cifra completa.
export function dineroAbreviado(valor) {
  if (Math.abs(valor) < 1_000_000) return dineroCompleto(valor);
  return `$ ${unDecimal.format(valor / 1_000_000)} M`;
}

// ---- Fórmulas --------------------------------------------------------------

// Por confirmar: estado "cotizado" y no vencida.
// Suman: total de esas mismas cotizaciones.
// Vencen esta semana: de esas, validez_oferta entre hoy y hoy + 6 (7 días contando hoy).
export function resumenPorConfirmar(cotizaciones, hoy) {
  const porConfirmar = cotizaciones.filter((c) => c.estado === "cotizado" && !c.vencida);
  const total = porConfirmar.reduce((suma, c) => suma + (Number(c.total) || 0), 0);
  const vencenSemana = porConfirmar.filter((c) => {
    if (!c.validez_oferta) return false;
    const dias = diasEntre(hoy, desdeISO(c.validez_oferta));
    return dias >= 0 && dias <= 6;
  }).length;
  return { cantidad: porConfirmar.length, total, vencenSemana };
}

// Eventos confirmados cuya fecha_evento cae en el mes de `fecha`. La lista no trae
// la fecha en que se confirmó, así que se cuenta por la fecha del evento.
export function confirmadosDelMes(cotizaciones, fecha) {
  return cotizaciones.filter((c) => {
    if (c.estado !== "confirmado" || !c.fecha_evento) return false;
    const evento = desdeISO(c.fecha_evento);
    return evento.getFullYear() === fecha.getFullYear() && evento.getMonth() === fecha.getMonth();
  }).length;
}

// Tasa de cierre (histórica): de las cotizaciones ya resueltas, cuántas se confirmaron.
//   confirmadas ÷ (confirmadas + canceladas + cotizadas vencidas)
// Las que siguen en curso (cotizadas vigentes y bloqueadas) no cuentan.
// Límite: un evento confirmado y luego cancelado cuenta como "no cerrado".
// Sin cotizaciones resueltas devuelve porcentaje null (no se inventa un 0 %).
export function tasaDeCierre(cotizaciones) {
  let confirmadas = 0;
  let perdidas = 0;
  cotizaciones.forEach((c) => {
    if (c.estado === "confirmado") confirmadas += 1;
    else if (c.estado === "cancelado" || (c.estado === "cotizado" && c.vencida)) perdidas += 1;
  });
  const resueltas = confirmadas + perdidas;
  return {
    porcentaje: resueltas ? Math.round((confirmadas / resueltas) * 100) : null,
    resueltas,
  };
}

// Ocupación por salón en los próximos `dias` días (desde hoy, inclusive):
//   días distintos con al menos un evento confirmado o bloqueado ÷ dias
// Las cotizadas no ocupan el salón. Incluye los salones sin eventos (0 %).
export function ocupacionPorSalon(eventos, salones, dias) {
  const fechasPorSalon = new Map();
  eventos
    .filter((e) => e.estado === "confirmado" || e.estado === "bloqueado")
    .forEach((e) => {
      const fechas = fechasPorSalon.get(e.salon) ?? new Set();
      fechas.add(e.fecha_evento);
      fechasPorSalon.set(e.salon, fechas);
    });
  return salones
    .map((s) => {
      const ocupados = fechasPorSalon.get(s.id)?.size ?? 0;
      return { id: s.id, nombre: s.nombre, ocupados, porcentaje: Math.round((ocupados / dias) * 100) };
    })
    .sort((a, b) => b.porcentaje - a.porcentaje || a.nombre.localeCompare(b.nombre, "es"));
}

// Agenda: eventos del calendario ordenados por fecha. Como /calendario/ no trae
// vencida ni validez_oferta, se completan con la fila de /cotizaciones/ (si cargó).
//   - estado "vencida" si la cotización ya venció;
//   - venceEn: días que le quedan a la oferta de una cotizada (0 a 6), o null.
export function armarAgenda(eventos, cotizacionesPorId, hoy) {
  return [...eventos]
    .sort((a, b) => a.fecha_evento.localeCompare(b.fecha_evento) || a.id - b.id)
    .map((e) => {
      const fila = cotizacionesPorId?.get(e.id);
      let venceEn = null;
      if (e.estado === "cotizado" && !fila?.vencida && fila?.validez_oferta) {
        const dias = diasEntre(hoy, desdeISO(fila.validez_oferta));
        if (dias >= 0 && dias <= 6) venceEn = dias;
      }
      return {
        ...e,
        fecha: desdeISO(e.fecha_evento),
        estadoVisible: e.estado === "cotizado" && fila?.vencida ? "vencida" : e.estado,
        venceEn,
      };
    });
}
