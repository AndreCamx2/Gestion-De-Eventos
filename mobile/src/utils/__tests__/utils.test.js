import { agruparPorDia } from "../dias";
import { mensajeDeError } from "../errores";
import { estadoVisible, puedeBloquear, puedeLiberar } from "../estados";
import { diaLegible, hoyISO, isoColombia, momentoLegible, opcionesBloqueo, sumarDias } from "../fechas";
import { decimalDelUsuario, pesos } from "../formato";
import { validarStock } from "../formularioStock";
import { ErrorApi, ErrorRed } from "../../api/cliente";

describe("fechas en hora de Colombia", () => {
  it("hoyISO usa la hora de Colombia, no la UTC", () => {
    // 18 oct 2026, 03:00 UTC = 17 oct, 10:00 p. m. en Colombia.
    expect(hoyISO(Date.parse("2026-10-18T03:00:00Z"))).toBe("2026-10-17");
  });

  it("sumarDias cruza meses y años", () => {
    expect(sumarDias("2026-10-30", 3)).toBe("2026-11-02");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("diaLegible y momentoLegible", () => {
    expect(diaLegible("2026-10-20")).toBe("mar 20 oct");
    expect(momentoLegible("2026-10-20T18:05:00-05:00")).toBe("20 oct, 6:05 p. m.");
    expect(momentoLegible("2026-10-20T05:00:00Z")).toBe("20 oct, 12:00 a. m.");
  });

  it("isoColombia escribe la zona -05:00", () => {
    expect(isoColombia(Date.parse("2026-10-20T23:00:00Z"))).toBe("2026-10-20T18:00:00-05:00");
  });
});

describe("opcionesBloqueo (SGDE-15)", () => {
  const ahora = Date.parse("2026-10-20T15:00:00-05:00");

  it("con el evento lejos ofrece 24, 48 y 72 horas y el día del evento", () => {
    const opciones = opcionesBloqueo("2026-11-30", ahora);
    expect(opciones.map((o) => o.clave)).toEqual(["24h", "48h", "72h", "evento"]);
    expect(opciones[0].valor).toBe("2026-10-21T15:00:00-05:00");
    expect(opciones[3].valor).toBe("2026-11-30T23:59:00-05:00");
  });

  it("no ofrece horas que pasan del día del evento", () => {
    const opciones = opcionesBloqueo("2026-10-21", ahora);
    expect(opciones.map((o) => o.clave)).toEqual(["24h", "evento"]);
  });

  it("si el evento ya pasó, no hay opciones", () => {
    expect(opcionesBloqueo("2026-10-19", ahora)).toEqual([]);
  });
});

describe("formato", () => {
  it("pesos con puntos de miles y sin decimales", () => {
    expect(pesos("4165000.00")).toBe("$ 4.165.000");
    expect(pesos(0)).toBe("$ 0");
    expect(pesos("999")).toBe("$ 999");
  });

  it("decimalDelUsuario acepta coma y vacío", () => {
    expect(decimalDelUsuario("12,5")).toBe("12.5");
    expect(decimalDelUsuario("  ")).toBeNull();
  });
});

describe("estados", () => {
  it("una cotizada vencida se muestra como vencida y no se puede bloquear", () => {
    const vencida = { estado: "cotizado", vencida: true };
    expect(estadoVisible(vencida)).toBe("vencida");
    expect(puedeBloquear(vencida)).toBe(false);
    expect(puedeBloquear({ estado: "cotizado", vencida: false })).toBe(true);
    expect(puedeLiberar({ estado: "bloqueado" })).toBe(true);
    expect(puedeLiberar({ estado: "confirmado" })).toBe(false);
  });
});

describe("agruparPorDia", () => {
  it("devuelve todos los días del rango, libres o con sus cotizaciones", () => {
    const filas = agruparPorDia(
      [{ id: 1, fecha_evento: "2026-10-21" }, { id: 2, fecha_evento: "2026-10-21" }],
      "2026-10-20",
      3,
    );
    expect(filas.map((f) => [f.fecha, f.cotizaciones.length])).toEqual([
      ["2026-10-20", 0],
      ["2026-10-21", 2],
      ["2026-10-22", 0],
    ]);
  });
});

describe("validarStock (SGDE-98)", () => {
  it("acepta cantidad entera y valor con coma", () => {
    expect(validarStock({ cantidad: "10", valor: "45000,5" })).toEqual({
      datos: { cantidad: 10, valor: "45000.5" },
      errores: {},
    });
  });

  it("rechaza negativos, decimales en la cantidad y nombre vacío", () => {
    const { errores } = validarStock({ nombreElemento: " ", cantidad: "1.5", valor: "-3" }, { conNombre: true });
    expect(Object.keys(errores).sort()).toEqual(["cantidad", "nombre_elemento", "valor"]);
  });
});

describe("mensajeDeError", () => {
  it("sin conexión", () => {
    expect(mensajeDeError(new ErrorRed()).general).toMatch(/No pudimos conectarnos/);
  });

  it("429, 403 sin vincular y 409 con detail", () => {
    expect(mensajeDeError(new ErrorApi(429, {})).general).toMatch(/muchos intentos/);
    expect(mensajeDeError(new ErrorApi(403, { detail: "x", codigo: "proveedor_sin_vincular" })).general).toMatch(
      /no está vinculado/,
    );
    expect(mensajeDeError(new ErrorApi(409, { detail: "La fecha está ocupada." })).general).toBe(
      "La fecha está ocupada.",
    );
  });

  it("400 con errores por campo", () => {
    const { general, campos } = mensajeDeError(
      new ErrorApi(400, { cantidad: ["Debe ser 0 o más."], nombre_elemento: ["Ya tienes uno: edítalo."] }),
    );
    expect(general).toBeNull();
    expect(campos).toEqual({ cantidad: "Debe ser 0 o más.", nombre_elemento: "Ya tienes uno: edítalo." });
  });
});
