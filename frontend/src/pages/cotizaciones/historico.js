import { desdeISO } from "../../utils/inicioCifras";
import { comoLista } from "./nuevaCotizacion";

export const ESTADOS_HISTORICO = [
  { clave: "todos", texto: "Todos" },
  { clave: "confirmado", texto: "Confirmados" },
  { clave: "cancelado", texto: "Cancelados" },
];

export const FILTROS_VACIOS = { estado: "todos", cliente: "", salon: "", desde: "", hasta: "" };

export function hayFiltros(filtros) {
  return Object.entries(filtros).some(([clave, valor]) => valor !== FILTROS_VACIOS[clave]);
}

export function consultas(filtros) {
  const base = {
    cliente: filtros.cliente || undefined,
    salon: filtros.salon || undefined,
    desde: filtros.desde || undefined,
    hasta: filtros.hasta || undefined,
  };
  const estados = filtros.estado === "todos" ? ["confirmado", "cancelado"] : [filtros.estado];
  return estados.map((estado) => ({ ...base, estado }));
}

export function unirResultados(listas) {
  return listas
    .flatMap(comoLista)
    .sort((a, b) => b.fecha_evento.localeCompare(a.fecha_evento) || b.id - a.id);
}

export function realizado(evento, hoy) {
  return evento.estado === "confirmado" && desdeISO(evento.fecha_evento) < hoy;
}

export function resumenHistorico(eventos, hoy) {
  const confirmados = eventos.filter((e) => e.estado === "confirmado");
  return {
    total: eventos.length,
    realizados: confirmados.filter((e) => realizado(e, hoy)).length,
    proximos: confirmados.filter((e) => !realizado(e, hoy)).length,
    cancelados: eventos.filter((e) => e.estado === "cancelado").length,
    valorConfirmado: confirmados.reduce((suma, e) => suma + Number(e.total || 0), 0),
  };
}

export function tipoDeError(error) {
  if (error?.status === 401) return "sesion";
  if (error?.status === 403) return "permiso";
  if (error?.status === 400) return "filtros";
  return "servidor";
}

export function mensajeFiltros(error) {
  const body = error?.body ?? {};
  const textos = ["desde", "hasta", "cliente", "salon", "estado", "detail"]
    .map((campo) => body[campo])
    .filter(Boolean)
    .map((e) => (Array.isArray(e) ? e.join(" ") : String(e)));
  return textos.join(" ") || "Revisa los filtros: alguno no es válido.";
}

export const ETIQUETAS_MOVIMIENTO = {
  creada: "Creada",
  vigencia: "Vigencia cambiada",
  bloqueada: "Fecha bloqueada",
  liberada: "Bloqueo liberado",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

export function etiquetaMovimiento(tipo) {
  return ETIQUETAS_MOVIMIENTO[tipo] ?? tipo;
}

const formatoMomento = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function momento(fechaHora) {
  const fecha = new Date(fechaHora);
  if (Number.isNaN(fecha.getTime())) return "";
  return formatoMomento.format(fecha);
}

export function quien(usuario) {
  return usuario === "sistema" ? "Sistema (automático)" : usuario;
}
