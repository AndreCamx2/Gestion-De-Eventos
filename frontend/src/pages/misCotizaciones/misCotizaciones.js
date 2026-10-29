// Funciones puras de "Mis cotizaciones" (SGDE-127 y SGDE-131): textos del estado
// para el cliente, fechas dd/mm/aaaa y el aviso de cada estado. Sin React.
import { estadoVisible } from "../../utils/estadosCotizacion";
import { desdeISO } from "../../utils/inicioCifras";
import { pesos } from "../cotizaciones/cotizaciones";
import { TIPOS_GARANTIA } from "../cotizaciones/detalleCotizacion";

// Palabras para el cliente: "bloqueado" es jerga interna del hotel.
export const ETIQUETAS_CLIENTE = {
  cotizado: "Cotizada",
  vencida: "Vencida",
  bloqueado: "Reservada temporalmente",
  confirmado: "Confirmada",
  cancelado: "Cancelada",
};

export function estadoCliente(c) {
  return estadoVisible(c);
}

export function etiquetaCliente(c) {
  const estado = estadoCliente(c);
  return ETIQUETAS_CLIENTE[estado] ?? estado;
}

const dosDigitos = (n) => String(n).padStart(2, "0");

// "AAAA-MM-DD" o fecha con hora → "dd/mm/aaaa".
export function fechaNumerica(valor) {
  if (!valor) return "—";
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? desdeISO(valor) : new Date(valor);
  return `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
}

// Fecha con hora → "hh:mm" en la hora local.
export function horaCorta(valor) {
  const fecha = new Date(valor);
  return `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

// Próximos: el evento es hoy o después, del más cercano al más lejano.
// Realizados: el evento ya pasó, del más reciente al más antiguo.
export function separarPorFecha(cotizaciones, hoy) {
  const proximos = [];
  const realizados = [];
  for (const c of cotizaciones) {
    (desdeISO(c.fecha_evento) >= hoy ? proximos : realizados).push(c);
  }
  proximos.sort((a, b) => a.fecha_evento.localeCompare(b.fecha_evento));
  realizados.sort((a, b) => b.fecha_evento.localeCompare(a.fecha_evento));
  return { proximos, realizados };
}

function tipoGarantia(tipo) {
  return TIPOS_GARANTIA.find((t) => t.valor === tipo)?.texto.toLowerCase() ?? tipo;
}

// El aviso del detalle según el estado: { tono, texto }. tono es el estado visible,
// para pintar el aviso con los colores del estado.
export function avisoDeEstado(c) {
  const estado = estadoCliente(c);
  switch (estado) {
    case "vencida":
      return { tono: estado, texto: "Esta cotización está vencida. Comunícate con tu asesor si aún te interesa." };
    case "bloqueado":
      return {
        tono: estado,
        texto: c.bloqueo_hasta
          ? `El salón está reservado para ti hasta el ${fechaNumerica(c.bloqueo_hasta)} a las ${horaCorta(c.bloqueo_hasta)}.`
          : "El salón está reservado para ti mientras confirmas.",
      };
    case "confirmado":
      return {
        tono: estado,
        texto: c.garantia
          ? `Tu evento está confirmado. Recibimos tu garantía por ${tipoGarantia(c.garantia.tipo)}: ${pesos(Number(c.garantia.monto))}.`
          : "Tu evento está confirmado.",
      };
    case "cancelado": {
      const partes = ["Este evento fue cancelado."];
      if (c.motivo_cancelacion) partes.push(`Motivo: ${c.motivo_cancelacion}.`);
      if (c.penalizacion_pct != null) partes.push(`Penalización: ${Number(c.penalizacion_pct)}%.`);
      return { tono: estado, texto: partes.join(" ") };
    }
    default:
      return {
        tono: "cotizado",
        texto: c.validez_oferta
          ? `Esta cotización es válida hasta el ${fechaNumerica(c.validez_oferta)}.`
          : "Tu asesor está esperando tu respuesta.",
      };
  }
}

// Error al cargar: "sesion" (401), "sinVincular" (403 con ese código), "permiso"
// (otro 403), "noExiste" (404) o "servidor" (500 o sin red).
export function tipoDeError(err) {
  if (err?.status === 401) return "sesion";
  if (err?.status === 403) return err.body?.codigo === "cliente_sin_vincular" ? "sinVincular" : "permiso";
  if (err?.status === 404) return "noExiste";
  return "servidor";
}
