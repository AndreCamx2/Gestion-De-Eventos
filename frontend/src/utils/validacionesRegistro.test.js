import { describe, expect, it } from "vitest";
import {
  digitoVerificacionNit,
  filtrarNit,
  validarCedula,
  validarContacto,
  validarCorreo,
  validarIdentificacionProveedor,
  validarNit,
  validarNombre,
  validarNombreCosa,
  validarNombrePersona,
  validarPassword,
  validarRazonSocial,
  validarTelefono,
  validarUsuario,
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

describe("Reglas de los formularios del administrador (revisión de QA)", () => {
  it("nombre o apellido de persona: solo letras", () => {
    expect(validarNombrePersona("María José")).toBeNull();
    expect(validarNombrePersona("O'Neil")).toBeNull();
    expect(validarNombrePersona("12312312")).toBe("Solo letras, sin números ni símbolos.");
    expect(validarNombrePersona("Ana 2")).toBe("Solo letras, sin números ni símbolos.");
    expect(validarNombrePersona(" ")).toBe("Este campo es obligatorio.");
  });

  it("nombre de venue, salón, concepto, proveedor o elemento: números sí, solo números no", () => {
    for (const valor of ["Salón 2", "Coffee break x 50", "Hotel Caribe S.A.S.", "Silla Tiffany (blanca)"]) {
      expect(validarNombreCosa(valor)).toBeNull();
    }
    expect(validarNombreCosa("123123123")).toMatch(/2 letras/);
    expect(validarNombreCosa("a1")).toMatch(/2 letras/);
    expect(validarNombreCosa("!!!")).toMatch(/Solo letras, números/);
  });

  it("usuario: al menos 3 letras", () => {
    expect(validarUsuario("jvargas")).toBeNull();
    expect(validarUsuario("admin2")).toBeNull();
    expect(validarUsuario("12312312")).toMatch(/3 letras/);
    expect(validarUsuario("ab1")).toMatch(/3 letras/);
    expect(validarUsuario("j vargas")).toMatch(/sin espacios/);
  });

  it("identificación de proveedor: cédula o NIT, opcional", () => {
    expect(validarIdentificacionProveedor("")).toBeNull();
    expect(validarIdentificacionProveedor("1.047.338.221")).toBeNull();
    expect(validarIdentificacionProveedor("900123456-8")).toBeNull();
    expect(validarIdentificacionProveedor("900123456-1")).toMatch(/dígito de verificación/);
    expect(validarIdentificacionProveedor("ffdsfs")).toMatch(/cédula/);
  });

  it("contacto: un nombre o un teléfono, opcional", () => {
    expect(validarContacto("")).toBeNull();
    expect(validarContacto("Carlos Pérez")).toBeNull();
    expect(validarContacto("Carlos 3001234567")).toBeNull();
    expect(validarContacto("300 123 4567")).toBeNull();
    expect(validarContacto("123")).toMatch(/celular/);
    expect(validarContacto("@@")).toMatch(/nombre de una persona/);
  });

  it("razón social: no puede ser solo números", () => {
    expect(validarRazonSocial("Eventos 360 S.A.S.")).toBeNull();
    expect(validarRazonSocial("12345")).toMatch(/2 letras/);
  });
});
