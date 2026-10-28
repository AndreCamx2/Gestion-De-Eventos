import { describe, expect, it } from "vitest";
import { montoRetenido, parsearPorcentaje, payloadCancelacion, puedeCancelar, validarCancelacion } from "./cancelacion";

describe("Monto retenido al cancelar (debe cuadrar con el backend)", () => {
  it("es total × % ÷ 100", () => {
    expect(montoRetenido("4165000.00", 20)).toBe(833000);
    expect(montoRetenido("4165000.00", 100)).toBe(4165000);
    expect(montoRetenido("4165000.00", 0)).toBe(0);
  });

  it("redondea a centavos hacia arriba en la mitad, como ROUND_HALF_UP", () => {
    expect(montoRetenido("10.05", 50)).toBe(5.03);
    expect(montoRetenido("1000.00", 12.5)).toBe(125);
    expect(montoRetenido("333.33", 33.33)).toBe(111.1);
  });

  it("sin un porcentaje válido no hay monto", () => {
    expect(montoRetenido("1000", null)).toBeNull();
    expect(montoRetenido("1000", NaN)).toBeNull();
    expect(montoRetenido("1000", 101)).toBeNull();
  });
});

describe("Formulario de cancelación", () => {
  it("lee el porcentaje con coma o punto", () => {
    expect(parsearPorcentaje("12,5")).toBe(12.5);
    expect(parsearPorcentaje(" 20 % ")).toBe(20);
    expect(parsearPorcentaje("")).toBeNull();
    expect(Number.isNaN(parsearPorcentaje("veinte"))).toBe(true);
  });

  it("pide porcentaje entre 0 y 100 y un motivo", () => {
    expect(validarCancelacion({ penalizacion: "", motivo: "  " })).toEqual({
      penalizacion_pct: "Escribe el porcentaje de penalización (0 si no hay).",
      motivo: "Escribe el motivo de la cancelación.",
    });
    expect(validarCancelacion({ penalizacion: "120", motivo: "x" }).penalizacion_pct).toBe(
      "La penalización debe estar entre 0 y 100.",
    );
    expect(validarCancelacion({ penalizacion: "0", motivo: "El cliente desistió" })).toEqual({});
  });

  it("manda el porcentaje con dos decimales y el motivo sin espacios de más", () => {
    expect(payloadCancelacion({ penalizacion: "12,5", motivo: "  Cambio de fecha " })).toEqual({
      penalizacionPct: "12.50",
      motivo: "Cambio de fecha",
    });
  });

  it("solo se cancela un evento confirmado", () => {
    expect(puedeCancelar({ estado: "confirmado" })).toBe(true);
    for (const estado of ["cotizado", "bloqueado", "cancelado"]) expect(puedeCancelar({ estado })).toBe(false);
  });
});
