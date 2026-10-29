import { describe, expect, it } from "vitest";
import {
  avisoOcupacion,
  cantidadInicial,
  esPorPersona,
  formDesdeCotizacion,
  lineasDesdeCotizacion,
  ocupacionDelDia,
  seguirPersonas,
  erroresDeGuardado,
  payloadCotizacion,
  validarCotizacion,
} from "./nuevaCotizacion";

const COFFEE = { id: 3, nombre: "Coffee break por persona", precio: "25000.00", impuesto_pct: "8.00" };
const SALON = { id: 1, nombre: "Alquiler de salón (día)", precio: "3500000.00", impuesto_pct: "19.00" };

describe("Conceptos por persona", () => {
  it("se reconocen por el nombre y arrancan con las personas", () => {
    expect(esPorPersona(COFFEE)).toBe(true);
    expect(esPorPersona(SALON)).toBe(false);
    expect(cantidadInicial(COFFEE, "80")).toBe("80");
    expect(cantidadInicial(COFFEE, "")).toBe("1");
    expect(cantidadInicial(SALON, "80")).toBe("1");
  });

  it("solo las líneas que siguen a las personas cambian", () => {
    const lineas = [
      { concepto: COFFEE, cantidad: "80", sigue: true },
      { concepto: COFFEE, cantidad: "5", sigue: false },
    ];
    expect(seguirPersonas(lineas, "100").map((l) => l.cantidad)).toEqual(["100", "5"]);
    expect(seguirPersonas(lineas, "")).toBe(lineas);
  });
});

describe("Editar una cotización guardada", () => {
  const COTIZACION = {
    id: 7,
    cliente: { id: 2, nombre: "María Ríos" },
    salon: { id: 4, nombre: "Salón Bolívar" },
    montaje: { id: 5, nombre: "Auditorio" },
    tipo_evento: { id: 20, nombre: "Congreso", grupo: { id: 2, nombre: "Congresos y convenciones" } },
    fecha_evento: "2026-12-10",
    cantidad_personas: 80,
    validez_oferta: "2026-11-01",
    items: [
      { concepto: 3, concepto_nombre: "Coffee break por persona", cantidad: 80, precio_unitario: "20000.00", impuesto_pct: "8.00" },
      { concepto: 99, concepto_nombre: "Concepto retirado", cantidad: 1, precio_unitario: "1000.00", impuesto_pct: "0.00" },
    ],
  };

  it("arma el formulario; una vigencia pasada queda vacía para que el API use la de por defecto", () => {
    expect(formDesdeCotizacion(COTIZACION, "2026-10-20")).toEqual({
      cliente: COTIZACION.cliente,
      salon: 4,
      montaje: 5,
      tipo_evento: "20",
      fecha_evento: "2026-12-10",
      cantidad_personas: "80",
      validez_oferta: "2026-11-01",
    });

    describe("Tipo de evento en el formulario", () => {
      const form = {
        cliente: { id: 2 },
        salon: 4,
        montaje: 5,
        tipo_evento: "20",
        fecha_evento: "2099-12-10",
        cantidad_personas: "80",
        validez_oferta: "",
      };
      const lineas = [{ concepto: { id: 6 }, cantidad: "1" }];

      it("es obligatorio y se incluye en el payload de crear o editar", () => {
        const errores = validarCotizacion({ ...form, tipo_evento: "" }, lineas, 100);
        expect(errores.campos.tipo_evento).toBe("Elige el tipo de evento.");

        expect(payloadCotizacion(form, lineas)).toMatchObject({
          tipo_evento: 20,
          cliente: 2,
          items: [{ concepto: 6, cantidad: 1 }],
        });
      });

      it("muestra debajo del selector el error de tipo que devuelve el backend", () => {
        const errores = erroresDeGuardado({
          status: 400,
          body: { tipo_evento: ["El tipo de evento está inactivo."] },
        }, lineas.length);

        expect(errores.campos.tipo_evento).toBe("El tipo de evento está inactivo.");
      });
    });
    expect(formDesdeCotizacion(COTIZACION, "2026-11-02").validez_oferta).toBe("");
  });

  it("las líneas usan el precio con que se cotizó, no el de hoy", () => {
    const lineas = lineasDesdeCotizacion(COTIZACION, [COFFEE]);
    expect(lineas[0]).toEqual({
      concepto: { ...COFFEE, precio: "20000.00", impuesto_pct: "8.00" },
      cantidad: "80",
      sigue: false,
    });
    expect(lineas[1].concepto).toMatchObject({ id: 99, nombre: "Concepto retirado", precio: "1000.00" });
  });
});

describe("Disponibilidad del salón ese día", () => {
  const evento = (id, estado, extra = {}) => ({ id, estado, vencida: false, cliente_nombre: `Cliente ${id}`, ...extra });

  it("una confirmada pesa más que un bloqueo y que las cotizadas", () => {
    const o = ocupacionDelDia([evento(1, "cotizado"), evento(2, "bloqueado"), evento(3, "confirmado")]);
    expect(avisoOcupacion(o)).toMatchObject({ tono: "error" });
    expect(avisoOcupacion(o).texto).toContain("Cliente 3");
  });

  it("no cuenta la propia ni las vencidas", () => {
    const o = ocupacionDelDia([evento(7, "confirmado"), evento(8, "cotizado", { vencida: true })], 7);
    expect(avisoOcupacion(o)).toEqual({ tono: "libre", texto: "El salón está libre ese día." });
  });

  it("avisa cuántas otras cotizaciones abiertas hay", () => {
    const o = ocupacionDelDia([evento(1, "cotizado"), evento(2, "cotizado")]);
    expect(avisoOcupacion(o).texto).toMatch(/^Hay 2 otras cotizaciones abiertas/);
    expect(avisoOcupacion(null)).toBeNull();
  });
});
