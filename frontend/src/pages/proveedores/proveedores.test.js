import { describe, expect, it } from "vitest";
import { usuariosLibres } from "./proveedores";

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
