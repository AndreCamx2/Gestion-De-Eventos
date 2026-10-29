// Cancelar un evento confirmado (SGDE-68): reglas y cálculos de la ventana.
// El API (POST /cotizaciones/<id>/cancelacion/) recibe el porcentaje y calcula el
// monto retenido; aquí se calcula igual para mostrarlo en vivo antes de guardar.
import { erroresDesdeApi } from "../../utils/erroresApi";

export const CANCELACION_VACIA = { penalizacion: "", motivo: "" };

const CAMPOS = ["penalizacion_pct", "motivo"];

// Solo un evento confirmado se cancela; el resto da 409 en el API.
export function puedeCancelar(c) {
  return c?.estado === "confirmado";
}

// "20", "12,5" o "12.5" → número; vacío → null; texto que no es número → NaN.
export function parsearPorcentaje(texto) {
  const limpio = String(texto ?? "").trim().replace(/\s|%/g, "").replace(",", ".");
  if (!limpio) return null;
  if (!/^\d+(\.\d+)?$/.test(limpio)) return NaN;
  return Number(limpio);
}

// total × pct ÷ 100, redondeado a centavos como el backend (ROUND_HALF_UP).
// Devuelve null si el porcentaje no sirve todavía.
export function montoRetenido(total, pct) {
  const base = Number(total);
  if (pct == null || Number.isNaN(pct) || pct < 0 || pct > 100 || !Number.isFinite(base)) return null;
  const centavos = Math.round(base * 100);
  const centesimas = Math.round(pct * 100);
  return Math.round((centavos * centesimas) / 10000) / 100;
}

export function validarCancelacion(form) {
  const campos = {};
  const pct = parsearPorcentaje(form.penalizacion);
  if (pct == null) campos.penalizacion_pct = "Escribe el porcentaje de penalización (0 si no hay).";
  else if (Number.isNaN(pct)) campos.penalizacion_pct = "Escribe solo números, por ejemplo 20.";
  else if (pct > 100) campos.penalizacion_pct = "La penalización debe estar entre 0 y 100.";
  else if (Math.round(pct * 100) !== pct * 100) campos.penalizacion_pct = "Usa máximo dos decimales.";
  if (!form.motivo.trim()) campos.motivo = "Escribe el motivo de la cancelación.";
  return campos;
}

export function payloadCancelacion(form) {
  return { penalizacionPct: parsearPorcentaje(form.penalizacion).toFixed(2), motivo: form.motivo.trim() };
}

// 400 del API: los de penalizacion_pct y motivo van bajo su campo; el resto, al final.
export function erroresCancelacion(body) {
  return erroresDesdeApi(body, CAMPOS);
}
