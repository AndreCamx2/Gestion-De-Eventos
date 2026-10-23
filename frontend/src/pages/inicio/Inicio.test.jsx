import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { simularApi } from "../../test/apiFalsa";
import Home from "../Home";
import Agenda from "./Agenda";
import Saludo from "./Saludo";

const HOY = new Date(2026, 9, 20);

const EVENTO = {
  id: 7,
  fecha_evento: "2026-11-09",
  fecha: new Date(2026, 10, 9),
  cliente_nombre: "María Pérez",
  salon_nombre: "Salón Bolívar",
  montaje_nombre: "Auditorio",
  cantidad_personas: 10,
  estadoVisible: "cotizado",
  venceEn: null,
};

function pintar(elemento) {
  return render(<MemoryRouter>{elemento}</MemoryRouter>);
}

describe("Inicio: acciones de cotizaciones", () => {
  it("el administrador tiene el enlace a Nueva cotización", () => {
    pintar(<Saludo hoy={HOY} nombre="admin" rol="administrador" cotizaciones={{ fase: "listo", datos: [] }} />);

    expect(screen.getByRole("link", { name: "Nueva cotización" })).toHaveAttribute("href", "/cotizaciones/nueva");
    expect(screen.queryByText("Disponible pronto")).not.toBeInTheDocument();
  });

  it("cada evento de la agenda abre su cotización", () => {
    pintar(<Agenda rol="administrador" calendario={{ fase: "listo", datos: [EVENTO] }} agenda={[EVENTO]} />);

    expect(screen.getByRole("link", { name: /María Pérez/ })).toHaveAttribute("href", "/cotizaciones/7");
  });

  it("sin permiso para ver cotizaciones, el evento no es un enlace", () => {
    pintar(<Agenda rol="cliente" calendario={{ fase: "listo", datos: [EVENTO] }} agenda={[EVENTO]} />);

    expect(screen.getByText("María Pérez")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /María Pérez/ })).not.toBeInTheDocument();
  });
});

const USUARIOS = {
  administrador: { id: 1, username: "admin", rol: { codigo: "administrador" }, sitios: [] },
  cliente: { id: 2, username: "cliente_demo", rol: { codigo: "cliente" }, sitios: [] },
  proveedor: { id: 3, username: "proveedor_demo", rol: { codigo: "proveedor" }, sitios: [], proveedor: { id: 4, nombre: "Sonido Caribe" } },
};

const MI_STOCK = [
  { id: 1, proveedor: 4, nombre_elemento: "Cabina", cantidad: 4, valor: "90000.00", actualizado_en: "2026-10-10T09:00:00-05:00" },
  { id: 2, proveedor: 4, nombre_elemento: "Micrófono", cantidad: 0, valor: "40000.00", actualizado_en: "2026-10-18T15:00:00-05:00" },
  { id: 3, proveedor: 4, nombre_elemento: "Consola", cantidad: 0, valor: "800000.00", actualizado_en: "2026-10-02T09:00:00-05:00" },
];

function abrirInicio(rol, rutas = {}) {
  const llamadas = simularApi({
    "GET /usuarios/me/": [200, USUARIOS[rol]],
    "GET /cotizaciones/": [200, []],
    "GET /calendario/": [200, []],
    "GET /salones/": [200, []],
    ...rutas,
  });
  pintar(<Home />);
  return llamadas;
}

const pidioMiStock = (llamadas) => llamadas.some((l) => l.ruta === "/mi-stock/");

describe("Inicio según el rol (SGDE-128)", () => {
  it("el proveedor ve el resumen de su inventario", async () => {
    abrirInicio("proveedor", { "GET /mi-stock/": [200, MI_STOCK] });

    const resumen = await screen.findByRole("region", { name: "Tu inventario" });
    const cifras = within(resumen);
    expect(cifras.getByText("Elementos").nextSibling).toHaveTextContent("3");
    expect(cifras.getByText("Agotados").nextSibling).toHaveTextContent("2");
    expect(cifras.getByText("Última actualización").nextSibling).toHaveTextContent("18 oct 2026");
    expect(cifras.getByRole("link", { name: "Ir a Mi stock" })).toHaveAttribute("href", "/mi-stock");
  });

  it("sin elementos, el proveedor es invitado a agregar el primero", async () => {
    abrirInicio("proveedor", { "GET /mi-stock/": [200, []] });
    expect(await screen.findByText("Aún no tienes elementos en tu stock")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a Mi stock" })).toBeInTheDocument();
  });

  it("si el usuario no está vinculado a un proveedor, lo dice", async () => {
    abrirInicio("proveedor", {
      "GET /mi-stock/": [403, { detail: "Sin proveedor", codigo: "proveedor_sin_vincular" }],
    });
    expect(await screen.findByText("Tu usuario todavía no está vinculado a un proveedor")).toBeInTheDocument();
    expect(screen.getByText("Pídele al administrador que lo vincule.")).toBeInTheDocument();
  });

  it("si falla el servidor, ofrece reintentar", async () => {
    const llamadas = abrirInicio("proveedor", { "GET /mi-stock/": [500, { detail: "Error" }] });
    const usuario = userEvent.setup();
    await usuario.click(await screen.findByRole("button", { name: /Reintentar/ }));
    expect(llamadas.filter((l) => l.ruta === "/mi-stock/").length).toBe(2);
  });

  it("el administrador no pide /mi-stock/", async () => {
    const llamadas = abrirInicio("administrador");
    expect(await screen.findByRole("link", { name: "Nueva cotización" })).toBeInTheDocument();
    expect(pidioMiStock(llamadas)).toBe(false);
  });

  it("el cliente conserva su aviso y no pide /mi-stock/", async () => {
    const llamadas = abrirInicio("cliente");
    expect(await screen.findByText("Pronto verás aquí tus cotizaciones y eventos.")).toBeInTheDocument();
    expect(pidioMiStock(llamadas)).toBe(false);
  });
});
