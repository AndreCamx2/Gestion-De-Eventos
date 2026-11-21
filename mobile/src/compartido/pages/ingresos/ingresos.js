// Funciones puras de la pantalla "¿Qué eventos generan más ingresos?" (SGDE-145):
// el rango de fechas de cada periodo y la lectura de la respuesta del API.
import { fechaISO, hoyLocal } from "../../utils/inicioCifras";

export const AGRUPACIONES = [
  { clave: "grupo", texto: "Grupo" },
  { clave: "tipo", texto: "Tipo de evento" },
];

export const PERIODOS = [
  { clave: "mes", texto: "Este mes" },
  { clave: "anio", texto: "Este año" },
  { clave: "rango", texto: "Rango de fechas" },
];

// Periodo elegido → { desde, hasta } en "AAAA-MM-DD" (fecha local, no UTC).
// "rango" usa las fechas que escribió la persona; vacías no se envían.
export function fechasDelPeriodo(periodo, rango = {}, hoy = hoyLocal()) {
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  if (periodo === "mes") {
    return { desde: fechaISO(new Date(anio, mes, 1)), hasta: fechaISO(new Date(anio, mes + 1, 0)) };
  }
  if (periodo === "anio") {
    return { desde: fechaISO(new Date(anio, 0, 1)), hasta: fechaISO(new Date(anio, 11, 31)) };
  }
  return { desde: rango.desde || "", hasta: rango.hasta || "" };
}

// Mensaje si el rango escrito no sirve; null si se puede consultar.
export function problemaDelRango(periodo, rango) {
  if (periodo !== "rango") return null;
  if (!rango.desde || !rango.hasta) return "Elige la fecha inicial y la final.";
  if (rango.desde > rango.hasta) return "La fecha final no puede ser anterior a la inicial.";
  return null;
}

const numero = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

const SIN_CLASIFICAR = "Sin clasificar";

// Respuesta del API → datos listos para pintar, por tipo o por grupo.
// - "tipo": una fila por tipo de evento, como llega del API.
// - "grupo": suma los tipos de cada grupo (el API solo agrupa por tipo).
// Los montos pasan de texto a número. El porcentaje y el ticket promedio de cada
// fila se calculan con el ingreso y los eventos de la fila, y `ancho` es su ingreso
// frente al mayor (0 a 100), para la barra.
export function leerIngresos(respuesta, agrupar = "grupo") {
  const tipos = (respuesta?.detalle ?? []).map((d) => {
    const sinTipo = d.tipo_evento_id == null;
    return {
      clave: sinTipo ? "sin-clasificar" : `tipo-${d.tipo_evento_id}`,
      nombre: sinTipo ? SIN_CLASIFICAR : d.tipo_evento_nombre,
      grupo: sinTipo ? null : d.grupo_evento_nombre,
      eventos: numero(d.cantidad_eventos),
      ingresos: numero(d.ingreso_total),
    };
  });

  let filas = tipos;
  if (agrupar === "grupo") {
    const porGrupo = new Map();
    tipos.forEach((t) => {
      const nombre = t.grupo ?? SIN_CLASIFICAR;
      const fila = porGrupo.get(nombre) ?? {
        clave: t.grupo ? `grupo-${nombre}` : "sin-clasificar",
        nombre,
        grupo: null,
        eventos: 0,
        ingresos: 0,
      };
      fila.eventos += t.eventos;
      fila.ingresos += t.ingresos;
      porGrupo.set(nombre, fila);
    });
    filas = [...porGrupo.values()];
  }

  const totalIngresos = numero(respuesta?.gran_total);
  filas = filas.filter((f) => f.eventos > 0).sort((a, b) => b.ingresos - a.ingresos);
  const mayor = filas[0]?.ingresos ?? 0;
  filas.forEach((f) => {
    f.porcentaje = totalIngresos > 0 ? (f.ingresos / totalIngresos) * 100 : 0;
    f.ticketPromedio = f.eventos > 0 ? f.ingresos / f.eventos : 0;
    f.ancho = mayor > 0 ? (f.ingresos / mayor) * 100 : 0;
  });

  return {
    totalEventos: numero(respuesta?.total_eventos),
    totalIngresos,
    ticketPromedio: numero(respuesta?.ticket_promedio),
    filas,
  };
}

const formatoPorcentaje = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

export function porcentaje(valor) {
  return `${formatoPorcentaje.format(valor)} %`;
}

export function textoEventos(n) {
  return n === 1 ? "1 evento" : `${n} eventos`;
}

// Error del API → qué mostrar.
export function tipoDeError(error) {
  if (error?.status === 401) return "sesion";
  if (error?.status === 403) return "permiso";
  if (error?.status === 400) return "filtros";
  return "servidor";
}

export function mensajeFiltros(error) {
  const body = error?.body ?? {};
  const textos = ["desde", "hasta", "detail", "non_field_errors"]
    .map((campo) => body[campo])
    .filter(Boolean)
    .map((e) => (Array.isArray(e) ? e.join(" ") : String(e)));
  return textos.join(" ") || "Revisa el periodo elegido.";
}
