import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { simularApi } from "../test/apiFalsa";
import MiCotizacion from "./MiCotizacion";
import MisCotizaciones from "./MisCotizaciones";
import { avisoDeEstado, fechaNumerica, separarPorFecha } from "./misCotizaciones/misCotizaciones";

// Fechas lejanas para no depender del día en que corren las pruebas.
const FILA = {
  id: 7,
  estado: "cotizado",
  vencida: false,
  salon_nombre: "Salón Bolívar",
  sitio_nombre: "Hotel Caribe",
  montaje_nombre: "Auditorio",
  cliente_nombre: "María Ríos",
  fecha_evento: "2099-12-10",
  cantidad_personas: 80,
  validez_oferta: "2099-11-30",
  bloqueo_hasta: null,
  total: "4165000.00",
  garantia: null,
};
const PASADA = { ...FILA, id: 3, estado: "confirmado", fecha_evento: "2020-05-02", salon_nombre: "Salón Heredia" };

const DETALLE = {
  ...FILA,
  creado_en: "2099-10-01T10:00:00-05:00",
  sitio: { id: 1, nombre: "Hotel Caribe" },
  cliente: { id: 2, nombre: "María Ríos", identificacion: "1047338221", correo: "maria@example.com" },
  salon: { id: 3, nombre: "Salón Bolívar" },
  montaje: { id: 4, nombre: "Auditorio" },
  aforo: 300,
  items: [{
    id: 5, concepto: 6, concepto_nombre: "Almuerzo ejecutivo", cantidad: 2, precio_unitario: "45000.00",
    subtotal: "90000.00", impuesto_pct: "8.00", impuesto: "7200.00", total: "97200.00",
  }],
  subtotal: "90000.00",
  impuestos: "7200.00",
  total: "97200.00",
  motivo_cancelacion: "",
  penalizacion_pct: null,
};

function abrirLista() {
  render(
    <MemoryRouter>
      <MisCotizaciones />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

function abrirDetalle(id = 7) {
  render(
    <MemoryRouter initialEntries={[`/mis-cotizaciones/${id}`]}>
      <Routes>
        <Route path="/mis-cotizaciones/:id" element={<MiCotizacion />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Mis cotizaciones del cliente (SGDE-127)", () => {
  it("separa próximos y realizados, y cada fila abre su detalle", async () => {
    simularApi({ "GET /mis-cotizaciones/": [200, [PASADA, FILA]] });
    const usuario = abrirLista();

    const lista = await screen.findByRole("list", { name: "Cotizaciones: próximos" });
    expect(within(lista).getByText("Salón Bolívar")).toBeInTheDocument();
    expect(within(lista).queryByText("Salón Heredia")).not.toBeInTheDocument();
    expect(within(lista).getByRole("link")).toHaveAttribute("href", "/mis-cotizaciones/7");
    expect(within(lista).getByText("10/12/2099")).toBeInTheDocument();
    expect(within(lista).getByText("$ 4.165.000")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: /Realizados/ }));
    const realizados = screen.getByRole("list", { name: "Cotizaciones: realizados" });
    expect(within(realizados).getByText("Salón Heredia")).toBeInTheDocument();
    expect(within(realizados).getByText("Confirmada")).toBeInTheDocument();
  });

  it("sin cotizaciones muestra un mensaje en vez de una lista vacía", async () => {
    simularApi({ "GET /mis-cotizaciones/": [200, []] });
    abrirLista();
    expect(await screen.findByText("Todavía no tienes cotizaciones")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("si el usuario no está vinculado a un cliente, lo dice (decide por el código del 403)", async () => {
    simularApi({ "GET /mis-cotizaciones/": [403, { detail: "Otro texto", codigo: "cliente_sin_vincular" }] });
    abrirLista();
    expect(await screen.findByText("Tu usuario todavía no está vinculado a un cliente")).toBeInTheDocument();
  });

  it("sin conexión ofrece reintentar", async () => {
    let fallar = true;
    simularApi({ "GET /mis-cotizaciones/": () => (fallar ? [500, {}] : [200, [FILA]]) });
    const usuario = abrirLista();
    const reintentar = await screen.findByRole("button", { name: "Reintentar" });
    fallar = false;
    await usuario.click(reintentar);
    expect(await screen.findByText("Salón Bolívar")).toBeInTheDocument();
  });
});

describe("Detalle de una cotización del cliente (SGDE-131)", () => {
  it("muestra el estado con palabras amables, los conceptos y el enlace al PDF", async () => {
    simularApi({ "GET /mis-cotizaciones/7/": [200, DETALLE] });
    abrirDetalle();
    expect(await screen.findByRole("heading", { level: 1, name: "Cotización #007" })).toBeInTheDocument();
    expect(screen.getByText("Esta cotización es válida hasta el 30/11/2099.")).toBeInTheDocument();
    expect(screen.getByText("Almuerzo ejecutivo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Descargar PDF" })).toHaveAttribute("href", "/mis-cotizaciones/7/imprimir");
    // Solo lectura: ninguna acción del administrador.
    expect(screen.queryByRole("button", { name: /Confirmar|Bloquear|Cancelar|Anular/ })).not.toBeInTheDocument();
  });

  it("una cotización ajena o inexistente (404) dice que no existe", async () => {
    simularApi({ "GET /mis-cotizaciones/99/": [404, { detail: "No encontrado." }] });
    abrirDetalle(99);
    expect(await screen.findByText("Esta cotización no existe")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver mis cotizaciones" })).toHaveAttribute("href", "/mis-cotizaciones");
  });
});

describe("Textos de Mis cotizaciones", () => {
  it("formatea fechas dd/mm/aaaa", () => {
    expect(fechaNumerica("2026-03-05")).toBe("05/03/2026");
    expect(fechaNumerica(null)).toBe("—");
  });

  it("separa por la fecha del evento: hoy cuenta como próximo", () => {
    const hoy = new Date(2026, 9, 27);
    const { proximos, realizados } = separarPorFecha(
      [{ fecha_evento: "2026-10-26" }, { fecha_evento: "2026-10-27" }, { fecha_evento: "2026-12-01" }],
      hoy,
    );
    expect(proximos.map((c) => c.fecha_evento)).toEqual(["2026-10-27", "2026-12-01"]);
    expect(realizados.map((c) => c.fecha_evento)).toEqual(["2026-10-26"]);
  });

  it("arma el aviso de cada estado", () => {
    expect(avisoDeEstado({ ...FILA, vencida: true }).texto).toMatch(/vencida/);
    expect(avisoDeEstado({ ...FILA, estado: "confirmado", garantia: { tipo: "transferencia", monto: "1000000.00" } }).texto)
      .toBe("Tu evento está confirmado. Recibimos tu garantía por transferencia: $ 1.000.000.");
    expect(avisoDeEstado({ ...FILA, estado: "cancelado", motivo_cancelacion: "Lluvia", penalizacion_pct: "20.00" }).texto)
      .toBe("Este evento fue cancelado. Motivo: Lluvia. Penalización: 20%.");
    expect(avisoDeEstado({ ...FILA, estado: "bloqueado", bloqueo_hasta: null }).texto)
      .toBe("El salón está reservado para ti mientras confirmas.");
  });
});
