// Aplazar la fecha de una cotización bloqueada o de un evento confirmado.
// El API (POST /cotizaciones/<id>/aplazamiento/) recibe { fecha_evento, motivo } y
// responde el detalle con la fecha nueva; 409 si el salón ya está ocupado ese día.
// Una cotizada no se aplaza: se cambia con "Editar".
import { erroresDesdeApi } from "../../utils/erroresApi";
import { desdeISO, fechaISO, hoyLocal } from "../../utils/inicioCifras";
import { errorMotivo } from "./cancelacion";

export const APLAZAMIENTO_VACIO = { fecha: "", motivo: "" };

const CAMPOS = ["fecha_evento", "motivo"];

export function puedeAplazar(c, hoy = hoyLocal()) {
  if (c?.estado !== "bloqueado" && c?.estado !== "confirmado") return false;
  return desdeISO(c.fecha_evento) >= hoy;
}

// La fecha más temprana que se puede elegir: hoy, o el día en que vence el bloqueo
// (el bloqueo no puede quedar después del evento).
export function fechaMinimaAplazamiento(c, hoy = hoyLocal()) {
  const deHoy = fechaISO(hoy);
  if (c?.estado !== "bloqueado" || !c.bloqueo_hasta) return deHoy;
  const finBloqueo = new Date(c.bloqueo_hasta);
  if (Number.isNaN(finBloqueo.getTime())) return deHoy;
  const delBloqueo = fechaISO(finBloqueo);
  return delBloqueo > deHoy ? delBloqueo : deHoy;
}

export function validarAplazamiento(form, c, hoy = hoyLocal()) {
  const campos = {};
  if (!form.fecha) campos.fecha_evento = "Elige la fecha nueva del evento.";
  else if (form.fecha === c.fecha_evento) campos.fecha_evento = "Elige una fecha distinta a la actual.";
  else if (form.fecha < fechaISO(hoy)) campos.fecha_evento = "La fecha nueva no puede ser pasada.";
  else if (form.fecha < fechaMinimaAplazamiento(c, hoy)) {
    campos.fecha_evento = "El bloqueo vence después de esa fecha. Libera el bloqueo o elige una fecha posterior.";
  }
  const motivo = errorMotivo(form.motivo, "del aplazamiento");
  if (motivo) campos.motivo = motivo;
  return campos;
}

export function payloadAplazamiento(form) {
  return { fechaEvento: form.fecha, motivo: form.motivo.trim() };
}

export function erroresAplazamiento(body) {
  return erroresDesdeApi(body, CAMPOS);
}
