// Fechas en hora de Colombia (UTC-5, sin horario de verano). Se calculan a mano,
// sin Intl ni zonas horarias, para que den lo mismo en cualquier teléfono.
const OFFSET_MS = -5 * 60 * 60 * 1000;
const HORA_MS = 60 * 60 * 1000;

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const dos = (n) => String(n).padStart(2, "0");

// Un instante (ms) → sus partes en hora de Colombia.
function partesColombia(ms) {
  const d = new Date(ms + OFFSET_MS);
  return {
    anio: d.getUTCFullYear(),
    mes: d.getUTCMonth(),
    dia: d.getUTCDate(),
    hora: d.getUTCHours(),
    minuto: d.getUTCMinutes(),
    semana: d.getUTCDay(),
  };
}

// "AAAA-MM-DD" de hoy en Colombia.
export function hoyISO(ahora = Date.now()) {
  const p = partesColombia(ahora);
  return `${p.anio}-${dos(p.mes + 1)}-${dos(p.dia)}`;
}

// "2026-10-20" + 3 → "2026-10-23".
export function sumarDias(fechaISO, dias) {
  const [a, m, d] = fechaISO.split("-").map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d + dias));
  return `${fecha.getUTCFullYear()}-${dos(fecha.getUTCMonth() + 1)}-${dos(fecha.getUTCDate())}`;
}

// "2026-10-20" → "lun 20 oct".
export function diaLegible(fechaISO) {
  const [a, m, d] = fechaISO.split("-").map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  return `${DIAS[fecha.getUTCDay()]} ${d} ${MESES[m - 1]}`;
}

// Un instante → "20 oct, 6:00 p. m." en hora de Colombia.
export function momentoLegible(instante) {
  const p = partesColombia(typeof instante === "number" ? instante : Date.parse(instante));
  const h12 = p.hora % 12 === 0 ? 12 : p.hora % 12;
  return `${p.dia} ${MESES[p.mes]}, ${h12}:${dos(p.minuto)} ${p.hora < 12 ? "a. m." : "p. m."}`;
}

// Un instante → ISO con la zona de Colombia: "2026-10-20T18:00:00-05:00".
export function isoColombia(ms) {
  const p = partesColombia(ms);
  return `${p.anio}-${dos(p.mes + 1)}-${dos(p.dia)}T${dos(p.hora)}:${dos(p.minuto)}:00-05:00`;
}

// Opciones de "bloquear hasta" para una cotización (SGDE-15). El backend exige
// que la hora límite sea futura y no pase del día del evento: las opciones que
// lo violarían no se ofrecen.
export function opcionesBloqueo(fechaEvento, ahora = Date.now()) {
  // Fin del día del evento: 11:59 p. m. en Colombia.
  const finDelEvento = Date.parse(`${fechaEvento}T23:59:00-05:00`);
  if (finDelEvento <= ahora) return [];

  // Se redondea al minuto para que la hora mostrada y la enviada sean la misma.
  const base = Math.ceil(ahora / 60000) * 60000;
  const opciones = [24, 48, 72]
    .map((horas) => ({ horas, ms: base + horas * HORA_MS }))
    .filter(({ ms }) => ms <= finDelEvento)
    .map(({ horas, ms }) => ({
      clave: `${horas}h`,
      etiqueta: `${horas} horas`,
      detalle: `hasta el ${momentoLegible(ms)}`,
      valor: isoColombia(ms),
    }));

  opciones.push({
    clave: "evento",
    etiqueta: "Hasta el día del evento",
    detalle: `hasta el ${momentoLegible(finDelEvento)}`,
    valor: isoColombia(finDelEvento),
  });
  return opciones;
}
