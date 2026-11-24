import { diaLegibleConAnio, esFechaISO, fechaLocalDeISO, isoDeFechaLocal } from "../fechas";

describe("fechas del campo con calendario", () => {
  it("reconoce solo fechas reales en AAAA-MM-DD", () => {
    expect(esFechaISO("2026-11-21")).toBe(true);
    expect(esFechaISO("2028-02-29")).toBe(true);
    expect(esFechaISO("2027-02-29")).toBe(false);
    expect(esFechaISO("2026-13-01")).toBe(false);
    expect(esFechaISO("2026-1-5")).toBe(false);
    expect(esFechaISO("")).toBe(false);
    expect(esFechaISO(null)).toBe(false);
  });

  it("ida y vuelta entre el texto del API y la fecha del calendario", () => {
    for (const t of ["2026-01-01", "2026-12-31", "2027-03-15"]) expect(isoDeFechaLocal(fechaLocalDeISO(t))).toBe(t);
    expect(isoDeFechaLocal(new Date(2026, 10, 21, 23, 59))).toBe("2026-11-21");
  });

  it("muestra el día con el año", () => {
    expect(diaLegibleConAnio("2026-11-26")).toBe("jue 26 nov 2026");
  });
});
