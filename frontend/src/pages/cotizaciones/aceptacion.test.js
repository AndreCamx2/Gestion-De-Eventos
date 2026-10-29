import { describe, expect, it } from "vitest";
import { textoGarantiaMinima, validarAceptacion } from "./detalleCotizacion";

// Total 2.430.000: el 30% son 729.000 (garantia_minima la manda el backend).
const CON_TIEMPO = { total: "2430000.00", garantia_minima: { porcentaje: "30", monto: "729000.00" } };
const DE_ULTIMA_HORA = { total: "2430000.00", garantia_minima: { porcentaje: "100", monto: "2430000.00" } };

const errorDeMonto = (monto, c) => validarAceptacion({ tipo: "efectivo", monto }, c)?.campos.monto;

describe("Garantía mínima al registrar la aceptación", () => {
  it("muestra el monto mínimo y su porcentaje", () => {
    expect(textoGarantiaMinima(CON_TIEMPO.garantia_minima)).toBe("Garantía mínima: $ 729.000 (30% del total).");
    expect(textoGarantiaMinima(DE_ULTIMA_HORA.garantia_minima)).toBe(
      "Garantía mínima: $ 2.430.000 (100% del total: el evento es en menos de 5 días).",
    );
    expect(textoGarantiaMinima(null)).toBeNull();
  });

  it("no deja enviar menos del mínimo", () => {
    expect(errorDeMonto("728.999", CON_TIEMPO)).toBe("La garantía mínima es $ 729.000 (30% del total).");
    expect(errorDeMonto("729.000", CON_TIEMPO)).toBeUndefined();
    expect(errorDeMonto("2.000.000", DE_ULTIMA_HORA)).toBe("La garantía mínima es $ 2.430.000 (100% del total).");
    expect(errorDeMonto("2.430.000", DE_ULTIMA_HORA)).toBeUndefined();
  });

  it("no deja enviar más del total", () => {
    expect(errorDeMonto("2.430.001", CON_TIEMPO)).toBe("La garantía no puede superar el total ($ 2.430.000).");
  });

  it("sin cotización solo revisa el formato del monto", () => {
    expect(errorDeMonto("100", undefined)).toBeUndefined();
  });
});
