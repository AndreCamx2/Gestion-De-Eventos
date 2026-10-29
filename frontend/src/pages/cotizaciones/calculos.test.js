import { describe, expect, it } from "vitest";
import { parsearMonto, puedeAceptar } from "./detalleCotizacion";
import { estadoAforo, totalesCotizacion, totalesLinea } from "./nuevaCotizacion";

const linea = (cantidad, precio, impuesto_pct) => ({ cantidad, concepto: { precio, impuesto_pct } });

describe("Totales de la cotización (deben cuadrar con el backend)", () => {
  it("calcula una línea en centavos, redondeando el impuesto como el servidor", () => {
    expect(totalesLinea("80", "48500.00", "8.00")).toEqual({ subtotal: 388000000, impuesto: 31040000, total: 419040000 });
    expect(totalesLinea("1", "0.05", "19.00")).toEqual({ subtotal: 5, impuesto: 1, total: 6 });
  });

  it("suma las líneas ya redondeadas y separa IVA e impoconsumo", () => {
    const t = totalesCotizacion([linea("1", "3500000.00", "19.00"), linea("100", "48500.00", "8.00")]);
    expect(t.subtotal).toBe(835000000);
    expect(t.impuestos).toBe(105300000);
    expect(t.total).toBe(940300000);
    expect(t.desglose.map((d) => d.nombre)).toEqual(["IVA 19%", "Impoconsumo 8%"]);
  });

  it("una cantidad no válida no suma", () => {
    expect(totalesLinea("", "1000", "19").total).toBe(0);
    expect(totalesLinea("1.5", "1000", "19").total).toBe(0);
  });
});

describe("Aforo", () => {
  it("avisa cuando se supera", () => {
    expect(estadoAforo("130", 120)).toMatchObject({ excede: true, texto: "Supera el aforo por 10 personas" });
    expect(estadoAforo("80", 120)).toMatchObject({ excede: false, porcentaje: 67 });
  });
});

describe("Monto de la garantía", () => {
  it("lee el formato colombiano", () => {
    expect(parsearMonto("3.220.000")).toBe(3220000);
    expect(parsearMonto("3.220.000,50")).toBe(3220000.5);
    expect(parsearMonto("$ 1.500.000")).toBe(1500000);
    expect(parsearMonto("1.000")).toBe(1000);
    expect(parsearMonto("3220000.5")).toBe(3220000.5);
    expect(parsearMonto("abc")).toBeNaN();
    expect(parsearMonto("")).toBeNull();
  });

  it("solo se acepta una cotizada vigente o una bloqueada", () => {
    expect(puedeAceptar({ estado: "cotizado", vencida: false })).toBe(true);
    expect(puedeAceptar({ estado: "cotizado", vencida: true })).toBe(false);
    expect(puedeAceptar({ estado: "bloqueado", vencida: false })).toBe(true);
    expect(puedeAceptar({ estado: "confirmado", vencida: false })).toBe(false);
  });
});
