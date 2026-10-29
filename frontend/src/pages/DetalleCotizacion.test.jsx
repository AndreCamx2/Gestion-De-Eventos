import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { simularApi } from "../test/apiFalsa";
import DetalleCotizacion from "./DetalleCotizacion";

const BASE = {
  id: 7,
  estado: "confirmado",
  vencida: false,
  cliente: { id: 1, nombre: "María Fernanda Ríos", tipo: "natural", identificacion: "1047338221" },
  salon: { id: 2, nombre: "Salón Bolívar" },
  montaje: { id: 3, nombre: "Auditorio" },
  aforo: 300,
  cantidad_personas: 80,
  fecha_evento: "2026-12-10",
  validez_oferta: "2026-11-30",
  creado_en: "2026-10-01T10:00:00-05:00",
  creado_por: "admin",
  items: [],
  subtotal: "3500000.00",
  impuestos: "665000.00",
  total: "4165000.00",
  garantia: { tipo: "transferencia", monto: "1000000.00", registrada_en: "2026-10-05T10:00:00-05:00", registrada_por: "admin" },
  bloqueo_hasta: null,
  cancelado_en: null,
  cancelado_por: null,
  penalizacion_pct: null,
  motivo_cancelacion: "",
  monto_retenido: null,
};

const CANCELADA = {
  ...BASE,
  estado: "cancelado",
  cancelado_en: "2026-10-14T11:00:00-05:00",
  cancelado_por: "admin",
  penalizacion_pct: "20.00",
  motivo_cancelacion: "El cliente desistió",
  monto_retenido: "833000.00",
};

function abrirDetalle(rutas) {
  const llamadas = simularApi({ "GET /cotizaciones/7/movimientos/": [200, []], ...rutas });
  render(
    <MemoryRouter initialEntries={["/cotizaciones/7"]}>
      <Routes>
        <Route path="/cotizaciones/:id" element={<DetalleCotizacion />} />
      </Routes>
    </MemoryRouter>,
  );
  return { usuario: userEvent.setup(), llamadas };
}

describe("Cancelar un evento (SGDE-68)", () => {
  it("el botón aparece en un evento confirmado", async () => {
    abrirDetalle({ "GET /cotizaciones/7/": [200, BASE] });
    expect(await screen.findByRole("button", { name: "Cancelar evento" })).toBeInTheDocument();
  });

  it.each([
    ["cotizado", { ...BASE, estado: "cotizado", garantia: null }],
    ["bloqueado", { ...BASE, estado: "bloqueado", garantia: null, bloqueo_hasta: "2026-11-01T18:00:00-05:00" }],
    ["cancelado", CANCELADA],
  ])("no aparece en un evento %s", async (_, datos) => {
    abrirDetalle({ "GET /cotizaciones/7/": [200, datos] });
    expect(await screen.findByRole("heading", { level: 1, name: "María Fernanda Ríos" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar evento" })).not.toBeInTheDocument();
  });

  it("muestra lo retenido en vivo, cancela y deja el panel de cancelada", async () => {
    const { usuario, llamadas } = abrirDetalle({
      "GET /cotizaciones/7/": [200, BASE],
      "POST /cotizaciones/7/cancelacion/": [200, CANCELADA],
    });
    await usuario.click(await screen.findByRole("button", { name: "Cancelar evento" }));
    const ventana = screen.getByRole("dialog", { name: "Cancelar evento" });

    await usuario.type(within(ventana).getByLabelText("Penalización (%)"), "20");
    expect(within(ventana).getByText(/Se retienen/)).toHaveTextContent(/833\.000/);
    await usuario.type(within(ventana).getByLabelText("Motivo"), "El cliente desistió");
    await usuario.click(within(ventana).getByRole("button", { name: "Cancelar evento" }));

    expect(await screen.findByRole("heading", { name: "Cotización cancelada" })).toHaveFocus();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar evento" })).not.toBeInTheDocument();
    expect(llamadas.find((l) => l.metodo === "POST").cuerpo).toEqual({ penalizacion_pct: "20.00", motivo: "El cliente desistió" });
    // Los movimientos se vuelven a pedir para mostrar la cancelación.
    expect(llamadas.filter((l) => l.ruta === "/cotizaciones/7/movimientos/")).toHaveLength(2);
  });

  it("sin motivo no llama al API y avisa bajo el campo; el 409 sale como conflicto", async () => {
    const { usuario, llamadas } = abrirDetalle({
      "GET /cotizaciones/7/": [200, BASE],
      "POST /cotizaciones/7/cancelacion/": [409, { detail: "Solo se puede cancelar una cotización confirmada." }],
    });
    await usuario.click(await screen.findByRole("button", { name: "Cancelar evento" }));
    const ventana = screen.getByRole("dialog", { name: "Cancelar evento" });

    await usuario.type(within(ventana).getByLabelText("Penalización (%)"), "10");
    await usuario.click(within(ventana).getByRole("button", { name: "Cancelar evento" }));
    expect(within(ventana).getByText("Escribe el motivo de la cancelación.")).toBeInTheDocument();
    expect(llamadas.some((l) => l.metodo === "POST")).toBe(false);

    await usuario.type(within(ventana).getByLabelText("Motivo"), "Duplicada");
    await usuario.click(within(ventana).getByRole("button", { name: "Cancelar evento" }));
    expect(await within(ventana).findByText("Solo se puede cancelar una cotización confirmada.")).toBeInTheDocument();
    // La X también se llama "Cerrar": se busca el botón por su texto.
    expect(within(ventana).getByText("Cerrar", { selector: "button" })).toHaveFocus();
  });
});

describe("Vista imprimible (SGDE-70)", () => {
  it("ofrece la cotización imprimible en la misma pestaña", async () => {
    // Otra pestaña copiaría la sesión, y la rotación del token (SGDE-92) dejaría
    // sin sesión a una de las dos al renovar.
    abrirDetalle({ "GET /cotizaciones/7/": [200, BASE] });
    const enlace = await screen.findByRole("link", { name: "Imprimir o PDF" });

    expect(enlace).toHaveAttribute("href", "/cotizaciones/7/imprimir");
    expect(enlace).not.toHaveAttribute("target");
  });
});

describe("Tipo de evento en el detalle (SGDE-143)", () => {
  it("muestra el tipo clasificado y marca las cotizaciones antiguas como Sin clasificar", async () => {
    abrirDetalle({
      "GET /cotizaciones/7/": [200, {
        ...BASE,
        tipo_evento: { id: 2, nombre: "Boda", grupo: { id: 1, nombre: "Social" } },
      }],
    });
    expect(await screen.findByText("Boda")).toBeInTheDocument();

    abrirDetalle({ "GET /cotizaciones/7/": [200, BASE] });
    expect(await screen.findByText("Sin clasificar")).toBeInTheDocument();
  });
});
