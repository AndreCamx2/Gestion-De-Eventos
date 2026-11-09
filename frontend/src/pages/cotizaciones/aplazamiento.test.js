import { describe, expect, it } from "vitest";
import { fechaMinimaAplazamiento, payloadAplazamiento, puedeAplazar, validarAplazamiento } from "./aplazamiento";

const HOY = new Date(2026, 10, 8); // 8 nov 2026, local
const base = { estado: "confirmado", fecha_evento: "2026-12-10", bloqueo_hasta: null };

describe("Reglas de Aplazar fecha", () => {
  it("solo bloqueadas o confirmadas cuyo evento no ha pasado", () => {
    expect(puedeAplazar(base, HOY)).toBe(true);
    expect(puedeAplazar({ ...base, estado: "bloqueado" }, HOY)).toBe(true);
    expect(puedeAplazar({ ...base, estado: "cotizado" }, HOY)).toBe(false);
    expect(puedeAplazar({ ...base, estado: "cancelado" }, HOY)).toBe(false);
    expect(puedeAplazar({ ...base, fecha_evento: "2026-11-01" }, HOY)).toBe(false);
  });

  it("la fecha mínima es hoy, o el día en que vence el bloqueo", () => {
    expect(fechaMinimaAplazamiento(base, HOY)).toBe("2026-11-08");
    const bloqueada = { ...base, estado: "bloqueado", bloqueo_hasta: "2026-11-20T12:00:00-05:00" };
    expect(fechaMinimaAplazamiento(bloqueada, HOY)).toBe("2026-11-20");
  });

  it("pide fecha distinta, no pasada, y un motivo con palabras", () => {
    expect(validarAplazamiento({ fecha: "", motivo: "" }, base, HOY)).toEqual({
      fecha_evento: "Elige la fecha nueva del evento.",
      motivo: "Escribe el motivo del aplazamiento.",
    });
    expect(validarAplazamiento({ fecha: "2026-12-10", motivo: "Lluvia" }, base, HOY).fecha_evento).toMatch(/distinta/);
    expect(validarAplazamiento({ fecha: "2026-11-01", motivo: "Lluvia" }, base, HOY).fecha_evento).toMatch(/pasada/);
    expect(validarAplazamiento({ fecha: "2026-12-20", motivo: "2026" }, base, HOY).motivo).toMatch(/con palabras/);
    expect(validarAplazamiento({ fecha: "2026-12-20", motivo: "Lluvia" }, base, HOY)).toEqual({});
  });

  it("una bloqueada no se mueve antes de que venza su bloqueo", () => {
    const bloqueada = { ...base, estado: "bloqueado", bloqueo_hasta: "2026-11-20T12:00:00-05:00" };
    expect(validarAplazamiento({ fecha: "2026-11-15", motivo: "Lluvia" }, bloqueada, HOY).fecha_evento).toMatch(/bloqueo/);
  });

  it("manda la fecha y el motivo sin espacios de más", () => {
    expect(payloadAplazamiento({ fecha: "2026-12-20", motivo: "  Lluvia " })).toEqual({ fechaEvento: "2026-12-20", motivo: "Lluvia" });
  });
});
