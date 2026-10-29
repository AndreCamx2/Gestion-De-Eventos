import { desdeISO, dineroCompleto, fechaISO, fechaLarga, hoyLocal, mesCorto } from "../../utils/inicioCifras";
import { textoError } from "../../utils/erroresApi";
import { fechaCorta } from "./cotizaciones";

export function idDeRuta(valor) {
  return /^\d+$/.test(String(valor ?? "")) ? Number(valor) : null;
}

export function fechaDelEvento(iso) {
  const fecha = desdeISO(iso);
  return `${fechaLarga(fecha)} de ${fecha.getFullYear()}`;
}

export function diaCorto(fechaHora) {
  if (!fechaHora) return null;
  const fecha = new Date(fechaHora);
  if (Number.isNaN(fecha.getTime())) return null;
  return `${fecha.getDate()} ${mesCorto(fecha)}`;
}

export function textoAforo(c) {
  return c.aforo ? `${c.cantidad_personas} de ${c.aforo} personas` : `${c.cantidad_personas} personas`;
}

export function textoCreacion(c) {
  const dia = diaCorto(c.creado_en);
  return [c.creado_por && `Creada por ${c.creado_por}`, dia].filter(Boolean).join(" · ");
}

export function datosCliente(cliente) {
  return {
    principal: cliente?.identificacion || "Sin identificación",
    secundario: cliente?.correo || "Sin correo",
  };
}

export function progreso(c, hoy = hoyLocal()) {
  const confirmada = c.estado === "confirmado";
  const eventoPasado = desdeISO(c.fecha_evento) < hoy;
  const pasos = [
    { clave: "creada", texto: ["Creada", diaCorto(c.creado_en)].filter(Boolean).join(" · "), hecho: true },
  ];
  if (c.estado === "bloqueado" || c.bloqueo_hasta) {
    pasos.push({ clave: "bloqueada", texto: "Fecha bloqueada", hecho: c.estado !== "cotizado" });
  }
  pasos.push({
    clave: "aceptada",
    texto: ["Aceptada con garantía", confirmada && diaCorto(c.confirmado_en)].filter(Boolean).join(" · "),
    hecho: confirmada,
  });
  pasos.push({
    clave: "evento",
    texto: `Evento · ${fechaCorta(c.fecha_evento, false)}`,
    hecho: confirmada && eventoPasado,
  });
  return pasos;
}

// Editar y anular: solo lo que aún no se confirmó. Editar exige "cotizado" (una
// bloqueada se libera primero); anular acepta también una bloqueada.
export function puedeEditar(c) {
  return c.estado === "cotizado";
}

export function puedeAnular(c) {
  return c.estado === "cotizado" || c.estado === "bloqueado";
}

// Bloquear: cotizada vigente cuyo evento aún no pasó (el API da 409/400 en otro caso).
export function puedeBloquear(c, hoy = hoyLocal()) {
  if (c.estado === "bloqueado") return true;
  return c.estado === "cotizado" && !c.vencida && desdeISO(c.fecha_evento) >= hoy;
}

export function puedeExtender(c) {
  return c.estado === "cotizado";
}

export function limitesVigencia(c, hoy = hoyLocal()) {
  return { min: fechaISO(hoy), max: c.fecha_evento };
}

export function validarVigencia(fecha, c, hoy = hoyLocal()) {
  const { min, max } = limitesVigencia(c, hoy);
  if (!fecha) return "Elige la nueva fecha de vigencia.";
  if (fecha < min) return "No puede ser anterior a hoy.";
  if (fecha > max) return "No puede pasar de la fecha del evento.";
  if (fecha === c.validez_oferta) return "Es la misma vigencia que ya tiene.";
  return null;
}

export function tipoDeError(error) {
  if (error?.status === 401) return "sesion";
  if (error?.status === 403) return "permiso";
  if (error?.status === 404) return "noExiste";
  if (error?.status === 409) return "conflicto";
  if (error?.status === 400) return "datos";
  return "servidor";
}

export function mensajeVigencia(error) {
  const tipo = tipoDeError(error);
  if (tipo === "datos") {
    const { validez_oferta, detail, non_field_errors } = error.body ?? {};
    const texto = validez_oferta ?? detail ?? non_field_errors;
    return { tipo, texto: texto ? textoError(texto) : "El servidor no aceptó esa fecha." };
  }
  if (tipo === "conflicto") {
    return { tipo, texto: error.body?.detail || "La cotización cambió de estado. Recarga la página." };
  }
  if (tipo === "permiso") return { tipo, texto: "Solo un administrador puede cambiar la vigencia." };
  if (tipo === "sesion") return { tipo, texto: "Tu sesión expiró. Vuelve a entrar con el aviso de abajo." };
  return { tipo, texto: "No pudimos hablar con el servidor. Inténtalo de nuevo." };
}

export function resumenCancelacion(c) {
  if (c.estado !== "cancelado") return null;
  return {
    // Anulada: se descartó sin haberse confirmado (sin garantía ni penalización).
    anulada: !c.garantia && c.penalizacion_pct == null,
    dia: diaCorto(c.cancelado_en),
    por: c.cancelado_por,
    penalizacion: c.penalizacion_pct != null ? Number(c.penalizacion_pct) : null,
    retenido: c.monto_retenido,
    motivo: c.motivo_cancelacion,
  };
}

export const TIPOS_GARANTIA = [
  { valor: "transferencia", texto: "Transferencia" },
  { valor: "tarjeta", texto: "Tarjeta" },
  { valor: "consignacion", texto: "Consignación" },
  { valor: "efectivo", texto: "Efectivo" },
];

export function nombreGarantia(tipo) {
  return TIPOS_GARANTIA.find((t) => t.valor === tipo)?.texto.toLowerCase() ?? tipo;
}

export const ACEPTACION_VACIA = { tipo: "", monto: "" };

export function puedeAceptar(c) {
  return (c.estado === "cotizado" && !c.vencida) || c.estado === "bloqueado";
}

export function parsearMonto(texto) {
  const limpio = String(texto ?? "").trim().replace(/\s|\$/g, "");
  if (!limpio) return null;
  if (!/^[\d.,]+$/.test(limpio)) return NaN;
  const coma = limpio.lastIndexOf(",");
  const puntos = limpio.split(".").length - 1;
  const decimalConPunto = coma < 0 && puntos === 1 && /\.\d{1,2}$/.test(limpio);
  let normal;
  if (coma >= 0) normal = `${limpio.slice(0, coma).replace(/[.,]/g, "")}.${limpio.slice(coma + 1)}`;
  else if (decimalConPunto) normal = limpio;
  else normal = limpio.replace(/\./g, "");
  const numero = Number(normal);
  if (!Number.isFinite(numero)) return NaN;
  return Math.round(numero * 100) / 100;
}

export function porcentajeDelTotal(monto, total) {
  const base = Number(total);
  if (monto == null || Number.isNaN(monto) || !base) return null;
  return Math.round((monto / base) * 1000) / 10;
}

// Garantía mínima (2026-10-27): 30% del total con 5 días o más de anticipación,
// 100% si el evento es antes. La calcula el backend (garantia_minima del detalle).
export function textoGarantiaMinima(minima) {
  if (!minima) return null;
  const motivo = minima.porcentaje === "100" ? ": el evento es en menos de 5 días" : "";
  return `Garantía mínima: ${dineroCompleto(Number(minima.monto))} (${minima.porcentaje}% del total${motivo}).`;
}

// La misma regla del backend, para avisar antes de enviar. `c` es la cotización.
export function validarAceptacion(form, c) {
  const campos = {};
  if (!form.tipo) campos.tipo = "Elige cómo dejó la garantía el cliente.";
  const monto = parsearMonto(form.monto);
  const minima = c?.garantia_minima;
  if (monto == null) campos.monto = "Escribe el monto recibido.";
  else if (Number.isNaN(monto)) campos.monto = "Escribe solo números, por ejemplo 3.220.000.";
  else if (monto <= 0) campos.monto = "El monto debe ser mayor que 0.";
  else if (monto >= 1e10) campos.monto = "El monto es demasiado grande.";
  else if (minima && monto < Number(minima.monto)) {
    campos.monto = `La garantía mínima es ${dineroCompleto(Number(minima.monto))} (${minima.porcentaje}% del total).`;
  } else if (c?.total != null && monto > Number(c.total)) {
    campos.monto = `La garantía no puede superar el total (${dineroCompleto(Number(c.total))}).`;
  }
  return Object.keys(campos).length ? { tipo: "datos", campos, texto: null } : null;
}

export function payloadAceptacion(form) {
  return { tipo: form.tipo, monto: parsearMonto(form.monto).toFixed(2) };
}

export function mensajeAceptacion(error) {
  const tipo = tipoDeError(error);
  if (tipo === "datos") {
    const { tipo: errTipo, monto, detail, non_field_errors } = error.body ?? {};
    const campos = {};
    if (errTipo) campos.tipo = textoError(errTipo);
    if (monto) campos.monto = textoError(monto);
    const general = detail ?? non_field_errors;
    return {
      tipo,
      campos,
      texto: general ? textoError(general) : Object.keys(campos).length ? null : "El servidor no aceptó los datos.",
    };
  }
  if (tipo === "conflicto") {
    return { tipo, campos: {}, texto: error.body?.detail || "La cotización cambió de estado. Recarga la página." };
  }
  if (tipo === "permiso") return { tipo, campos: {}, texto: "Solo un administrador puede registrar la aceptación." };
  if (tipo === "sesion") {
    return { tipo, campos: {}, texto: "Tu sesión expiró. Vuelve a entrar con el aviso de abajo: lo escrito no se pierde." };
  }
  if (tipo === "noExiste") return { tipo, campos: {}, texto: "Esta cotización ya no existe." };
  return { tipo, campos: {}, texto: "No pudimos hablar con el servidor. Inténtalo de nuevo." };
}
