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

// Fecha y hora del API ("2026-10-12T15:30:00-05:00") → ¿cae en el mes de `fecha`?
// new Date() respeta la zona que trae el texto, y getMonth() lo pasa a la hora local.
function enElMes(textoFechaHora, fecha) {
  if (!textoFechaHora) return false;
  const momento = new Date(textoFechaHora);
  return momento.getFullYear() === fecha.getFullYear() && momento.getMonth() === fecha.getMonth();
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

// Cotizaciones confirmadas en el mes de `fecha`, según confirmado_en (la fecha en
// que se registró la aceptación), no según la fecha del evento.
// Las confirmadas a mano en /admin/ traen confirmado_en null: no tienen fecha y no cuentan.
export function confirmadosDelMes(cotizaciones, fecha) {
  return cotizaciones.filter((c) => c.estado === "confirmado" && enElMes(c.confirmado_en, fecha)).length;
}

// Tasa de cierre del mes: de las cotizaciones RESUELTAS en el mes de `hoy`, cuántas
// se confirmaron.
//   confirmadas ÷ (confirmadas + perdidas)
//   - confirmadas: confirmado_en cae en el mes;
//   - perdidas: cotizadas vencidas cuya validez_oferta cae en el mes (y ya pasó).
// Las canceladas todavía no cuentan: no guardan la fecha en que se cancelaron.
// Cuando SGDE-61 guarde cancelado_en, se suman a las perdidas del mes en que se cancelaron.
// Las que siguen en curso (cotizadas vigentes y bloqueadas) no cuentan.
// Sin cotizaciones resueltas devuelve porcentaje null (no se inventa un 0 %).
export function tasaDeCierre(cotizaciones, hoy) {
  let confirmadas = 0;
  let perdidas = 0;
  cotizaciones.forEach((c) => {
    if (c.estado === "confirmado" && enElMes(c.confirmado_en, hoy)) confirmadas += 1;
    else if (c.estado === "cotizado" && c.vencida && c.validez_oferta) {
      const validez = desdeISO(c.validez_oferta);
      if (validez.getFullYear() === hoy.getFullYear() && validez.getMonth() === hoy.getMonth()) perdidas += 1;
    }
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

// Agenda: eventos de /calendario/ ordenados por fecha, que ya trae vencida y validez_oferta.
//   - estado "vencida" si la cotización ya venció;
//   - venceEn: días que le quedan a la oferta de una cotizada (0 a 6), o null.
export function armarAgenda(eventos, hoy) {
  return [...eventos]
    .sort((a, b) => a.fecha_evento.localeCompare(b.fecha_evento) || a.id - b.id)
    .map((e) => {
      let venceEn = null;
      if (e.estado === "cotizado" && !e.vencida && e.validez_oferta) {
        const dias = diasEntre(hoy, desdeISO(e.validez_oferta));
        if (dias >= 0 && dias <= 6) venceEn = dias;
      }
      return {
        ...e,
        fecha: desdeISO(e.fecha_evento),
        estadoVisible: e.vencida ? "vencida" : e.estado,
        venceEn,
      };
    });
}
