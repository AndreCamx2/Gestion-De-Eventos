import { describe, expect, it } from "vitest";
import {
  cambiosStock,
  estaAgotado,
  filtrarStock,
  quedaAgotado,
  usuariosLibres,
  validarEdicionStock,
  validarElemento,
} from "./proveedores";

const VALIDO = { nombre_elemento: "Silla Tiffany", cantidad: "10", valor: "8000.50" };

describe("Validaciones de un elemento del stock (SGDE-130)", () => {
  it("acepta un elemento correcto", () => {
    expect(validarElemento(VALIDO)).toEqual({});
    expect(validarElemento({ ...VALIDO, cantidad: "0", valor: "0" })).toEqual({});
  });

  it("el nombre es obligatorio y admite máximo 120 caracteres sin contar los espacios de los extremos", () => {
    expect(validarElemento({ ...VALIDO, nombre_elemento: "   " }).nombre_elemento).toBe("Escribe el nombre del elemento.");
    expect(validarElemento({ ...VALIDO, nombre_elemento: "a".repeat(121) }).nombre_elemento).toBe(
      "El nombre admite máximo 120 caracteres.",
    );
    expect(validarElemento({ ...VALIDO, nombre_elemento: `  ${"a".repeat(120)}  ` })).toEqual({});
  });

  it.each(["1.5", "1e3", "-1", "abc"])("rechaza la cantidad %s", (cantidad) => {
    expect(validarElemento({ ...VALIDO, cantidad }).cantidad).toBe(
      "La cantidad es un número entero, 0 o más, sin decimales.",
    );
  });

  it("el valor admite máximo 2 decimales y 10 dígitos antes de ellos", () => {
    expect(validarElemento({ ...VALIDO, valor: "10.555" }).valor).toBe("El valor admite máximo 2 decimales.");
    expect(validarElemento({ ...VALIDO, valor: "12345678901" }).valor).toBe(
      "El valor admite máximo 10 dígitos antes de los decimales.",
    );
    expect(validarElemento({ ...VALIDO, valor: "1234567890.99" })).toEqual({});
  });

  it.each(["1e5", "-5", "12,5"])("rechaza el valor %s", (valor) => {
    expect(validarElemento({ ...VALIDO, valor }).valor).toBe("El valor es un número, 0 o más.");
  });

  it("editar usa las mismas reglas de cantidad y valor", () => {
    expect(validarEdicionStock({ cantidad: "1e3", valor: "1.234" })).toEqual({
      cantidad: "La cantidad es un número entero, 0 o más, sin decimales.",
      valor: "El valor admite máximo 2 decimales.",
    });
  });

  it("sin cambios no hay nada que enviar", () => {
    expect(cambiosStock({ cantidad: "200", valor: "8000" }, { cantidad: 200, valor: "8000.00" })).toEqual({});
  });

  it("sabe cuándo un elemento queda o está agotado", () => {
    expect(quedaAgotado({ cantidad: "0" })).toBe(true);
    expect(quedaAgotado({ cantidad: "3" })).toBe(false);
    expect(estaAgotado({ cantidad: 0 })).toBe(true);
  });
});

describe("Buscador del stock (SGDE-129)", () => {
  const elementos = [
    { id: 1, nombre_elemento: "Cabina Activa" },
    { id: 2, nombre_elemento: "Mantel Ñandú" },
  ];

  it("no distingue mayúsculas ni tildes", () => {
    expect(filtrarStock(elementos, "cabina").map((e) => e.id)).toEqual([1]);
    expect(filtrarStock(elementos, "  NANDU ").map((e) => e.id)).toEqual([2]);
    expect(filtrarStock(elementos, "")).toBe(elementos);
  });
});

describe("Usuario de acceso del proveedor (SGDE-72)", () => {
  const usuarios = [
    { id: 3, username: "luces" },
    { id: 1, username: "sonido" },
    { id: 2, username: "mobiliario" },
  ];
  const proveedores = [
    { id: 10, usuario: 1 },
    { id: 11, usuario: null },
    { id: 12, usuario: 3 },
  ];

  it("ofrece los usuarios libres y el que ya tiene el proveedor, por nombre", () => {
    expect(usuariosLibres(usuarios, proveedores, proveedores[0]).map((u) => u.username)).toEqual(["mobiliario", "sonido"]);
    expect(usuariosLibres(usuarios, proveedores, proveedores[1]).map((u) => u.username)).toEqual(["mobiliario"]);
  });
});
