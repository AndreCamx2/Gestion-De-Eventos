import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { simularApi } from "../test/apiFalsa";
import MiStock from "./MiStock";

const YO = { id: 9, username: "proveedor_demo", rol: { codigo: "proveedor" }, sitios: [], proveedor: { id: 4, nombre: "Proveedor Demo" } };
const STOCK = [
  { id: 1, proveedor: 4, nombre_elemento: "Silla Tiffany", cantidad: 200, valor: "8000.00", actualizado_en: "2026-10-14T09:00:00-05:00" },
];

function abrir() {
  render(
    <MemoryRouter>
      <MiStock />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe("Mi stock (SGDE-72)", () => {
  it("muestra el stock del proveedor con su nombre de subtítulo", async () => {
    simularApi({ "GET /mi-stock/": [200, STOCK], "GET /usuarios/me/": [200, YO] });
    abrir();
    expect(await screen.findByText("Silla Tiffany")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Mi stock" })).toBeInTheDocument();
    expect(screen.getByText("Proveedor Demo")).toBeInTheDocument();
  });

  it("si el usuario no está vinculado, lo dice (decide por el código del 403)", async () => {
    simularApi({
      "GET /mi-stock/": [403, { detail: "Otro texto cualquiera", codigo: "proveedor_sin_vincular" }],
      "GET /usuarios/me/": [200, { ...YO, proveedor: null }],
    });
    abrir();
    expect(await screen.findByText("Tu usuario todavía no está vinculado a un proveedor")).toBeInTheDocument();
    expect(screen.getByText("Pídele al administrador que lo vincule.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Agregar elemento/ })).not.toBeInTheDocument();
  });

  it("sin elementos invita a agregar el primero", async () => {
    simularApi({ "GET /mi-stock/": [200, []], "GET /usuarios/me/": [200, YO] });
    abrir();
    expect(await screen.findByText("Aún no tienes elementos en tu stock")).toBeInTheDocument();
  });

  it("agrega un elemento por /mi-stock/ y muestra el 400 bajo el campo", async () => {
    const llamadas = simularApi({
      "GET /mi-stock/": [200, STOCK],
      "GET /usuarios/me/": [200, YO],
      "POST /mi-stock/": ({ cuerpo }) =>
        cuerpo.nombre_elemento === "Silla Tiffany"
          ? [400, { nombre_elemento: ["Ya tienes un elemento con este nombre: edítalo."] }]
          : [201, { id: 2, proveedor: 4, actualizado_en: "2026-10-14T10:00:00-05:00", ...cuerpo, valor: "1500.00" }],
    });
    const usuario = abrir();
    await usuario.click(await screen.findByRole("button", { name: /Agregar elemento/ }));
    const ventana = screen.getByRole("dialog", { name: "Agregar elemento" });
    await usuario.type(within(ventana).getByLabelText("Elemento"), "Silla Tiffany");
    await usuario.type(within(ventana).getByLabelText("Cantidad"), "10");
    await usuario.type(within(ventana).getByLabelText("Valor unitario"), "1500");
    await usuario.click(within(ventana).getByRole("button", { name: "Guardar" }));
    expect(await within(ventana).findByText("Ya tienes un elemento con este nombre: edítalo.")).toBeInTheDocument();

    await usuario.clear(within(ventana).getByLabelText("Elemento"));
    await usuario.type(within(ventana).getByLabelText("Elemento"), "Mantel");
    await usuario.click(within(ventana).getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Mantel")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(llamadas.filter((l) => l.metodo === "POST").every((l) => l.ruta === "/mi-stock/")).toBe(true);
  });
});
