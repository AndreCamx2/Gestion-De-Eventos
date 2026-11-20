import { describe, expect, it } from "vitest";
import { validarCliente } from "../pages/clientes/formularioCliente";
import { validarEmpresa } from "../pages/clientes/nuevaEmpresa";
import { validarForm } from "../pages/conceptos/conceptos";
import { validarCancelacion } from "../pages/cotizaciones/cancelacion";
import { validarCotizacion } from "../pages/cotizaciones/nuevaCotizacion";
import { validarElemento, validarProveedor } from "../pages/proveedores/proveedores";
import { validarAforo, validarSalon } from "../pages/salones/salones";
import { validarEdicion, validarNuevo } from "../pages/usuarios/usuarios";
import { fechaISO, hoyLocal, sumarDias } from "./inicioCifras";
import { validarCedula, validarDocumento, validarNombre } from "./validacionesRegistro";

const CLIENTE = {
  tipo: "natural", nombre: "Ana Pérez", identificacion: "1047000111", telefono: "", correo: "",
  empresa: "", forma_pago: "", observaciones_internas: "",
};

describe("nombres y documentos", () => {
  it("el nombre empieza y termina en letra, sin signos seguidos", () => {
    for (const nombre of ["-Ana Pérez", "Ana Pérez'", "Ana -- Pérez"]) {
      expect(validarNombre(nombre)).toMatch(/solo letras/i);
    }
    expect(validarNombre("María-José O'Neill")).toBeNull();
  });

  it("la tilde escrita aparte cuenta como letra", () => {
    expect(validarNombre("José Pérez")).toBeNull();
  });

  it("la cédula no empieza por 0 ni acepta dígitos de otros alfabetos", () => {
    expect(validarCedula("0047000111")).toMatch(/sin empezar por 0/);
    expect(validarCedula("١٠٤٧٠٠٠١١١")).toMatch(/solo números/i);
  });

  it("un documento de proveedor puede ser cédula o NIT", () => {
    expect(validarDocumento("1047000111")).toBeNull();
    expect(validarDocumento("900123456-8")).toBeNull();
    expect(validarDocumento("abc")).toMatch(/cédula o un NIT/);
  });
});

describe("clientes y empresas", () => {
  it("valida el cliente del administrador como el registro", () => {
    expect(validarCliente(CLIENTE, { esCrear: true })).toEqual({});
    const errores = validarCliente(
      { ...CLIENTE, nombre: "123", identificacion: "abc", telefono: "12", correo: "ana@" },
      { esCrear: true },
    );
    expect(Object.keys(errores).sort()).toEqual(["correo", "identificacion", "nombre", "telefono"]);
  });

  it("un jurídico necesita empresa y no pide cédula", () => {
    expect(validarCliente({ ...CLIENTE, tipo: "juridica", identificacion: "" }, { esCrear: true })).toEqual({
      empresa: "Elige la empresa del cliente.",
    });
  });

  it("al editar, un natural viejo sin identificación se puede guardar", () => {
    expect(validarCliente({ ...CLIENTE, identificacion: "" }, { esCrear: false })).toEqual({});
  });

  it("observaciones de más de 2000 caracteres no pasan", () => {
    expect(validarCliente({ ...CLIENTE, observaciones_internas: "a".repeat(2001) }, { esCrear: true })).toHaveProperty(
      "observaciones_internas",
    );
  });

  it("la empresa revisa razón social, NIT y su dígito de verificación", () => {
    const vacia = { razon_social: "", identificacion: "", contacto: "", correo: "", ciudad: "" };
    expect(validarEmpresa({ ...vacia, razon_social: "Eventos del Mar S.A.S.", identificacion: "900123456-8" })).toEqual({});
    expect(validarEmpresa({ ...vacia, razon_social: "!!!", identificacion: "900123456-0" })).toEqual({
      razon_social: expect.any(String),
      identificacion: expect.stringMatching(/dígito de verificación/),
    });
  });
});

describe("salones y conceptos", () => {
  const SALON = { nombre: "Salón Barú", ancho: "", altura: "", foto_url: "" };

  it("rechaza medidas absurdas", () => {
    for (const medida of ["0", "-3", "Infinity", "1e3", "12.345", "1000"]) {
      expect(validarSalon({ ...SALON, ancho: medida })).toHaveProperty("ancho");
    }
    expect(validarSalon({ ...SALON, ancho: "12,5", altura: "4" })).toEqual({});
  });

  it("la foto solo acepta enlaces web", () => {
    expect(validarSalon({ ...SALON, foto_url: "javascript:alert(1)" })).toHaveProperty("foto_url");
    expect(validarSalon({ ...SALON, foto_url: "https://fotos.co/baru.jpg" })).toEqual({});
  });

  it("el aforo va de 1 a 100.000", () => {
    expect(validarAforo("0")).not.toBeNull();
    expect(validarAforo("100001")).toMatch(/100\.000/);
    expect(validarAforo("250")).toBeNull();
  });

  it("el precio del concepto no acepta notación rara ni más de 10 dígitos", () => {
    const concepto = { sitio: "1", nombre: "Video beam", precio: "", impuesto_pct: "19" };
    for (const precio of ["1e3", "Infinity", " ", "12.345", "12345678901"]) {
      expect(validarForm({ ...concepto, precio })).toHaveProperty("precio");
    }
    expect(validarForm({ ...concepto, precio: "-5" }).precio).toMatch(/negativo/);
    expect(validarForm({ ...concepto, precio: "250000.50" })).toEqual({});
  });
});

describe("proveedores y usuarios", () => {
  it("el proveedor revisa nombre, documento y contacto", () => {
    expect(validarProveedor({ nombre: "!!!", identificacion: "abc", contacto: "a".repeat(121) })).toEqual({
      nombre: expect.any(String),
      identificacion: expect.any(String),
      contacto: "Máximo 120 caracteres.",
    });
  });

  it("la cantidad de stock no pasa de un millón", () => {
    expect(validarElemento({ nombre_elemento: "Sillas", cantidad: "1000001", valor: "8000" })).toHaveProperty("cantidad");
  });

  it("un usuario nuevo con datos de más no pasa", () => {
    const errores = validarNuevo({
      rol: "2", username: "a".repeat(151), email: `${"b".repeat(150)}@sgde.co`, password: "x".repeat(129), sitios: [],
    });
    expect(Object.keys(errores).sort()).toEqual(["email", "password", "username"]);
  });

  it("al editar, el nombre y el apellido son letras", () => {
    const errores = validarEdicion({ rol: "2", email: "", first_name: "Pedro2", last_name: "", sitios: [] });
    expect(errores).toHaveProperty("first_name");
  });
});

describe("cotizaciones", () => {
  const FORM = {
    cliente: { id: 1 }, salon: 1, montaje: 1, tipo_evento: "1",
    fecha_evento: fechaISO(sumarDias(hoyLocal(), 30)), cantidad_personas: "50", validez_oferta: "",
  };
  const LINEA = { concepto: { id: 1 }, cantidad: "1" };

  it("pone topes a la cantidad, al número de conceptos y a la fecha", () => {
    expect(validarCotizacion(FORM, [{ ...LINEA, cantidad: "100001" }], 100).lineas[0]).toMatch(/100\.000/);
    expect(validarCotizacion(FORM, Array(101).fill(LINEA), 100).general).toMatch(/máximo 100/);
    expect(validarCotizacion({ ...FORM, fecha_evento: "9999-12-31" }, [LINEA], 100).campos).toHaveProperty("fecha_evento");
    expect(validarCotizacion(FORM, [LINEA], 100)).toBeNull();
  });

  it("el motivo de la cancelación admite 1000 caracteres", () => {
    expect(validarCancelacion({ penalizacion: "10", motivo: "a".repeat(1001) })).toHaveProperty("motivo");
  });
});
