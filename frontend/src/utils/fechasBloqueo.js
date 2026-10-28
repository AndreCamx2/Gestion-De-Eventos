// Fechas y horas del bloqueo de una cotización (SGDE-40). Las usan el Rack
// (SGDE-69), el Calendario (SGDE-45) y el panel compartido de components/bloqueo/.
// Funciones puras, sin React.
import { desdeISO, fechaISO } from "./inicioCifras";

const FORMATO_COLOMBIA = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// ISO del API → "14/10/2026 18:00" en la hora de Colombia, sin importar la zona del equipo.
export function fechaHoraColombia(iso) {
  const partes = Object.fromEntries(FORMATO_COLOMBIA.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${partes.day}/${partes.month}/${partes.year} ${partes.hour}:${partes.minute}`;
}

const dos = (n) => String(n).padStart(2, "0");

// Date → "AAAA-MM-DDTHH:mm" en hora LOCAL (lo que espera un <input type="datetime-local">).
// No se usa toISOString().slice(0, 16): daría la hora UTC, 5 horas corrida.
export function valorDatetimeLocal(fecha) {
  return `${fechaISO(fecha)}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

// Valor del campo → ISO con zona para el API. new Date("AAAA-MM-DDTHH:mm") lo lee en hora local.
export function datetimeLocalAISO(valor) {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

// Bloqueo por defecto: dentro de 48 horas, pero nunca después de las 23:59 del día del evento.
export function bloqueoPorDefecto(ahora, fechaEvento) {
  const en48 = new Date(ahora.getTime() + 48 * 60 * 60 * 1000);
  const evento = desdeISO(fechaEvento);
  const finDelEvento = new Date(evento.getFullYear(), evento.getMonth(), evento.getDate(), 23, 59);
  return valorDatetimeLocal(en48 < finDelEvento ? en48 : finDelEvento);
}
