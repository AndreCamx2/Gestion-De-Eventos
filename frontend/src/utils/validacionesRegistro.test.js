import { describe, expect, it } from "vitest";
import {
  digitoVerificacionNit,
  filtrarNit,
  validarCedula,
  validarCorreo,
  validarNit,
  validarNombre,
  validarPassword,
  validarRazonSocial,
  validarTelefono,
} from "./validacionesRegistro";

describe("validacionesRegistro", () => {
  it("nombre: solo letras y con apellido", () => {
    expect(validarNombre("María José Pérez")).toBeNull();
    expect(validarNombre("Juan123 Pérez")).toMatch(/solo letras/i);
    expect(validarNombre("Juan")).toMatch(/apellido/i);
    expect(validarNombre("   ")).toMatch(/obligatorio/i);
  });

  it("razón social: letras, números y signos de empresa", () => {
    expect(validarRazonSocial("Eventos del Caribe S.A.S.")).toBeNull();
    expect(validarRazonSocial("Eventos <script>")).not.toBeNull();
  });

  it("cédula: solo números entre 6 y 10", () => {
    expect(validarCedula("1.045.678")).toBeNull();
    expect(validarCedula("abc12345")).toMatch(/solo números/i);
    expect(validarCedula("12345")).toMatch(/solo números/i);
  });

  it("NIT: revisa el dígito de verificación", () => {
    expect(digitoVerificacionNit("900123456")).toBe(8);
    expect(digitoVerificacionNit("890480184")).toBe(4);
    expect(validarNit("900123456-8")).toBeNull();
    expect(validarNit("900123456")).toBeNull();
    expect(validarNit("900123456-7")).toMatch(/dígito de verificación/i);
    expect(validarNit("NIT9001")).toMatch(/solo números/i);
  });

  it("NIT: el filtro solo deja números y un dígito después del guion", () => {
    expect(filtrarNit("90a0-12")).toBe("900-1");
  });

  it("teléfono: celular o fijo colombiano", () => {
    expect(validarTelefono("+57 300 123 4567")).toBeNull();
    expect(validarTelefono("6056601234")).toBeNull();
    expect(validarTelefono("12345")).not.toBeNull();
  });

  it("correo: formato válido", () => {
    expect(validarCorreo("maria@correo.com")).toBeNull();
    expect(validarCorreo("maria@correo")).not.toBeNull();
  });

  it("contraseña: letras, números y sin datos personales", () => {
    expect(validarPassword("Salones2026", ["María Pérez", "maria@correo.com"])).toBeNull();
    expect(validarPassword("12345678")).toMatch(/solo números/i);
    expect(validarPassword("solamenteletras")).toMatch(/una letra y un número/i);
    expect(validarPassword("Maria2026x", ["María Pérez", "maria@correo.com"])).toMatch(/nombre, correo/i);
    expect(validarPassword("Ab1")).toMatch(/8 caracteres/i);
  });
});
