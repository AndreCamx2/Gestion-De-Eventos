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
const VARIOS = [
  ...STOCK,
  { id: 2, proveedor: 4, nombre_elemento: "Cabina Acústica", cantidad: 0, valor: "150000.00", actualizado_en: "2026-10-15T09:00:00-05:00" },
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

  it("el nombre repetido sale debajo del campo Elemento", async () => {
    simularApi({
      "GET /mi-stock/": [200, STOCK],
      "GET /usuarios/me/": [200, YO],
      "POST /mi-stock/": [400, { nombre_elemento: ["Ya tienes un elemento con este nombre: edítalo."] }],
    });
    const usuario = abrir();
    await usuario.click(await screen.findByRole("button", { name: /Agregar elemento/ }));
    const ventana = screen.getByRole("dialog", { name: "Agregar elemento" });
    await usuario.type(within(ventana).getByLabelText("Elemento"), "Silla Tiffany");
    await usuario.type(within(ventana).getByLabelText("Cantidad"), "5");
    await usuario.type(within(ventana).getByLabelText("Valor unitario"), "100");
    await usuario.click(within(ventana).getByRole("button", { name: "Guardar" }));

    const campo = within(ventana).getByLabelText("Elemento");
    await within(ventana).findByText("Ya tienes un elemento con este nombre: edítalo.");
    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(campo).toHaveAccessibleDescription("Ya tienes un elemento con este nombre: edítalo.");
  });

  it("valida antes de enviar: cantidad con decimales y nombre de más de 120 caracteres", async () => {
    const llamadas = simularApi({ "GET /mi-stock/": [200, STOCK], "GET /usuarios/me/": [200, YO] });
    const usuario = abrir();
    await usuario.click(await screen.findByRole("button", { name: /Agregar elemento/ }));
    const ventana = screen.getByRole("dialog", { name: "Agregar elemento" });
    await usuario.click(within(ventana).getByLabelText("Elemento"));
    await usuario.paste("a".repeat(121));
    await usuario.type(within(ventana).getByLabelText("Cantidad"), "1.5");
    await usuario.type(within(ventana).getByLabelText("Valor unitario"), "10.555");
    await usuario.click(within(ventana).getByRole("button", { name: "Guardar" }));

    expect(within(ventana).getByLabelText("Elemento")).toHaveAccessibleDescription("El nombre admite máximo 120 caracteres.");
    expect(within(ventana).getByLabelText("Cantidad")).toHaveAccessibleDescription(
      "La cantidad es un número entero, 0 o más, sin decimales.",
    );
    expect(within(ventana).getByLabelText("Valor unitario")).toHaveAccessibleDescription("El valor admite máximo 2 decimales.");
    expect(llamadas.some((l) => l.metodo === "POST")).toBe(false);
  });

  it("busca sin distinguir mayúsculas ni tildes y marca los agotados", async () => {
    simularApi({ "GET /mi-stock/": [200, VARIOS], "GET /usuarios/me/": [200, YO] });
    const usuario = abrir();
    await screen.findByText("Cabina Acústica");
    const tabla = screen.getByRole("table");
    const filaCabina = within(tabla).getByText("Cabina Acústica").closest("tr");
    expect(within(filaCabina).getByText("Agotado")).toBeInTheDocument();
    expect(within(within(tabla).getByText("Silla Tiffany").closest("tr")).queryByText("Agotado")).not.toBeInTheDocument();

    await usuario.type(screen.getByLabelText("Buscar elemento"), "ACUSTICA");
    expect(within(screen.getByRole("table")).getByText("Cabina Acústica")).toBeInTheDocument();
    expect(screen.queryByText("Silla Tiffany")).not.toBeInTheDocument();

    await usuario.clear(screen.getByLabelText("Buscar elemento"));
    await usuario.type(screen.getByLabelText("Buscar elemento"), "carpa");
    expect(screen.getByText("No hay elementos que coincidan con «carpa»")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("al editar avisa que quedará agotado, guarda y muestra Guardado", async () => {
    const llamadas = simularApi({
      "GET /mi-stock/": [200, STOCK],
      "GET /usuarios/me/": [200, YO],
      "PATCH /mi-stock/1/": ({ cuerpo }) => [200, { ...STOCK[0], ...cuerpo }],
    });
    const usuario = abrir();
    await usuario.click(await screen.findByRole("button", { name: "Editar Silla Tiffany" }));
    const ventana = screen.getByRole("dialog", { name: "Editar elemento" });
    expect(within(ventana).queryByText("El elemento quedará como agotado")).not.toBeInTheDocument();

    await usuario.clear(within(ventana).getByLabelText("Cantidad"));
    await usuario.type(within(ventana).getByLabelText("Cantidad"), "0");
    expect(within(ventana).getByText("El elemento quedará como agotado")).toBeInTheDocument();

    await usuario.click(within(ventana).getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Guardado")).toHaveAttribute("role", "status");
    expect(llamadas.find((l) => l.metodo === "PATCH").cuerpo).toEqual({ cantidad: 0 });
    expect(within(screen.getByRole("table")).getByText("Agotado")).toBeInTheDocument();
  });

  it("si nada cambió no envía el PATCH", async () => {
    const llamadas = simularApi({ "GET /mi-stock/": [200, STOCK], "GET /usuarios/me/": [200, YO] });
    const usuario = abrir();
    await usuario.click(await screen.findByRole("button", { name: "Editar Silla Tiffany" }));
    await usuario.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Guardar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(llamadas.some((l) => l.metodo === "PATCH")).toBe(false);
    expect(screen.queryByText("Guardado")).not.toBeInTheDocument();
  });
});
