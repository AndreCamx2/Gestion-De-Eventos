// Estados de una cotización con los colores de Piedra viva
// (docs/diseno/piedra-viva/README.md, sección 2). Siempre texto + color.
export const ESTADOS = {
  cotizado: { etiqueta: "Cotizado", fondo: "rgba(240,180,41,0.16)", texto: "#875A00", punto: "#F0B429" },
  bloqueado: { etiqueta: "Bloqueado", fondo: "rgba(111,131,217,0.18)", texto: "#3A4C99", punto: "#6F83D9" },
  confirmado: { etiqueta: "Confirmado", fondo: "rgba(52,168,106,0.14)", texto: "#1F6E44", punto: "#34A86A" },
  vencida: { etiqueta: "Vencida", fondo: "rgba(238,138,99,0.16)", texto: "#9C4826", punto: "#EE8A63" },
  cancelado: { etiqueta: "Cancelado", fondo: "rgba(93,102,115,0.18)", texto: "#525A66", punto: "#6E7581" },
};

// "Vencida" no es un estado del backend: es una cotizada con la oferta vencida.
export function estadoVisible(cotizacion) {
  return cotizacion.estado === "cotizado" && cotizacion.vencida ? "vencida" : cotizacion.estado;
}

// Qué se puede hacer con una cotización desde la app (mismas reglas que estados.py).
export function puedeBloquear(cotizacion) {
  return cotizacion.estado === "cotizado" && !cotizacion.vencida;
}

export function puedeLiberar(cotizacion) {
  return cotizacion.estado === "bloqueado";
}
