import { describe, expect, it } from "vitest";
import { fechasDelPeriodo, leerIngresos, problemaDelRango } from "./ingresos";

const HOY = new Date(2026, 9, 28); // 28 oct 2026

describe("fechasDelPeriodo", () => {
  it("este mes va del primero al último día del mes", () => {
    expect(fechasDelPeriodo("mes", {}, HOY)).toEqual({ desde: "2026-10-01", hasta: "2026-10-31" });
    expect(fechasDelPeriodo("mes", {}, new Date(2028, 1, 10))).toEqual({ desde: "2028-02-01", hasta: "2028-02-29" });
  });

  it("este año va del 1 de enero al 31 de diciembre", () => {
    expect(fechasDelPeriodo("anio", {}, HOY)).toEqual({ desde: "2026-01-01", hasta: "2026-12-31" });
  });

  it("el rango usa las fechas escritas", () => {
    expect(fechasDelPeriodo("rango", { desde: "2026-03-01", hasta: "2026-05-31" }, HOY)).toEqual({
      desde: "2026-03-01",
      hasta: "2026-05-31",
    });
  });
});

describe("problemaDelRango", () => {
  it("pide las dos fechas y que estén en orden", () => {
    expect(problemaDelRango("rango", { desde: "", hasta: "" })).toMatch(/fecha inicial y la final/);
    expect(problemaDelRango("rango", { desde: "2026-06-01", hasta: "2026-05-01" })).toMatch(/no puede ser anterior/);
    expect(problemaDelRango("rango", { desde: "2026-05-01", hasta: "2026-06-01" })).toBeNull();
    expect(problemaDelRango("mes", { desde: "", hasta: "" })).toBeNull();
  });
});

// Respuesta como la de GET /api/reportes/ingresos-por-tipo-evento/ (SGDE-144).
const RESPUESTA = {
  gran_total: "10000000.00",
  total_eventos: 5,
  ticket_promedio: "2000000.00",
  detalle: [
    { tipo_evento_id: 13, tipo_evento_nombre: "Boda", grupo_evento_nombre: "Social", cantidad_eventos: 2, ingreso_total: "4000000.00", porcentaje_ingreso: 40 },
    { tipo_evento_id: 1, tipo_evento_nombre: "Reunión corporativa", grupo_evento_nombre: "Reuniones", cantidad_eventos: 1, ingreso_total: "3000000.00", porcentaje_ingreso: 30 },
    { tipo_evento_id: 14, tipo_evento_nombre: "Quince años o cumpleaños", grupo_evento_nombre: "Social", cantidad_eventos: 1, ingreso_total: "2000000.00", porcentaje_ingreso: 20 },
    { tipo_evento_id: null, tipo_evento_nombre: "Sin clasificar", grupo_evento_nombre: "Sin clasificar", cantidad_eventos: 1, ingreso_total: "1000000.00", porcentaje_ingreso: 10 },
  ],
};

describe("leerIngresos", () => {
  it("por tipo: una fila por tipo, con porcentaje, ticket promedio y ancho de barra", () => {
    const datos = leerIngresos(RESPUESTA, "tipo");
    expect(datos.totalIngresos).toBe(10000000);
    expect(datos.totalEventos).toBe(5);
    expect(datos.ticketPromedio).toBe(2000000);
    expect(datos.filas.map((f) => f.nombre)).toEqual(["Boda", "Reunión corporativa", "Quince años o cumpleaños", "Sin clasificar"]);
    expect(datos.filas[0]).toMatchObject({ grupo: "Social", eventos: 2, ingresos: 4000000, porcentaje: 40, ticketPromedio: 2000000, ancho: 100 });
    expect(datos.filas[3]).toMatchObject({ clave: "sin-clasificar", grupo: null, ancho: 25 });
  });

  it("por grupo: suma los tipos de cada grupo y ordena de mayor a menor", () => {
    const datos = leerIngresos(RESPUESTA, "grupo");
    expect(datos.filas.map((f) => f.nombre)).toEqual(["Social", "Reuniones", "Sin clasificar"]);
    expect(datos.filas[0]).toMatchObject({ eventos: 3, ingresos: 6000000, porcentaje: 60, ticketPromedio: 2000000, ancho: 100 });
    expect(datos.filas[1]).toMatchObject({ eventos: 1, ingresos: 3000000, porcentaje: 30, ancho: 50 });
  });

  it("los totales por grupo cuadran con los del API", () => {
    const datos = leerIngresos(RESPUESTA, "grupo");
    expect(datos.filas.reduce((s, f) => s + f.ingresos, 0)).toBe(datos.totalIngresos);
    expect(datos.filas.reduce((s, f) => s + f.eventos, 0)).toBe(datos.totalEventos);
  });

  it("sin respuesta o sin detalle devuelve una lista vacía", () => {
    expect(leerIngresos(null).filas).toEqual([]);
    expect(leerIngresos({ gran_total: "0.00", total_eventos: 0, ticket_promedio: "0.00", detalle: [] }).filas).toEqual([]);
  });
});
