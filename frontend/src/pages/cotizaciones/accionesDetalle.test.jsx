import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { simularApi } from "../../test/apiFalsa";
import DetalleCotizacion from "../DetalleCotizacion";

// Una cotizada vigente de diciembre: se puede editar, bloquear y anular.
const COTIZADA = {
  id: 7,
  estado: "cotizado",
  vencida: false,
  cliente: { id: 1, nombre: "María Fernanda Ríos", identificacion: "1047338221" },
  salon: { id: 2, nombre: "Salón Bolívar" },
  montaje: { id: 3, nombre: "Auditorio" },
  aforo: 300,
  cantidad_personas: 80,
  fecha_evento: "2099-12-10",
  validez_oferta: "2099-11-30",
  creado_en: "2026-10-01T10:00:00-05:00",
  creado_por: "admin",
  items: [],
  subtotal: "3500000.00",
  impuestos: "665000.00",
  total: "4165000.00",
  garantia: null,
  bloqueo_hasta: null,
  cancelado_en: null,
  cancelado_por: null,
  penalizacion_pct: null,
  motivo_cancelacion: "",
  monto_retenido: null,
};

const ANULADA = {
  ...COTIZADA,
  estado: "cancelado",
  cancelado_en: "2026-10-20T11:00:00-05:00",
  cancelado_por: "admin",
  motivo_cancelacion: "Eligió otro lugar",
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

describe("Acciones del detalle de una cotización", () => {
  it("una cotizada ofrece Editar, Bloquear fecha y Anular", async () => {
    abrirDetalle({ "GET /cotizaciones/7/": [200, COTIZADA] });
    expect(await screen.findByRole("link", { name: "Editar" })).toHaveAttribute("href", "/cotizaciones/7/editar");
    expect(screen.getByRole("button", { name: "Bloquear fecha" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anular cotización" })).toBeInTheDocument();
  });

  it("una bloqueada no se edita, pero se libera o se anula", async () => {
    const bloqueada = { ...COTIZADA, estado: "bloqueado", bloqueo_hasta: "2099-11-01T18:00:00-05:00" };
    const { usuario, llamadas } = abrirDetalle({
      "GET /cotizaciones/7/": [200, bloqueada],
      "DELETE /cotizaciones/7/bloqueo/": [200, COTIZADA],
    });
    await usuario.click(await screen.findByRole("button", { name: "Liberar bloqueo" }));
    expect(llamadas.some((l) => l.metodo === "DELETE" && l.ruta === "/cotizaciones/7/bloqueo/")).toBe(true);
    // Ya liberada, vuelve a ofrecer Editar.
    expect(await screen.findByRole("link", { name: "Editar" })).toBeInTheDocument();
  });

  it("anula con motivo y deja el panel de anulada", async () => {
    const { usuario, llamadas } = abrirDetalle({
      "GET /cotizaciones/7/": [200, COTIZADA],
      "POST /cotizaciones/7/anulacion/": [200, ANULADA],
    });
    await usuario.click(await screen.findByRole("button", { name: "Anular cotización" }));
    const ventana = screen.getByRole("dialog", { name: "Anular cotización" });

    await usuario.click(within(ventana).getByRole("button", { name: "Anular cotización" }));
    expect(within(ventana).getByText("Escribe el motivo de la anulación.")).toBeInTheDocument();
    expect(llamadas.some((l) => l.ruta === "/cotizaciones/7/anulacion/")).toBe(false);

    await usuario.type(within(ventana).getByLabelText("Motivo"), "Eligió otro lugar");
    await usuario.click(within(ventana).getByRole("button", { name: "Anular cotización" }));

    expect(await screen.findByRole("heading", { name: "Cotización anulada" })).toBeInTheDocument();
    expect(llamadas.find((l) => l.ruta === "/cotizaciones/7/anulacion/").cuerpo).toEqual({ motivo: "Eligió otro lugar" });
    expect(screen.queryByRole("link", { name: "Editar" })).not.toBeInTheDocument();
  });

  it("una confirmada no se edita ni se anula", async () => {
    const confirmada = {
      ...COTIZADA,
      estado: "confirmado",
      garantia: { tipo: "efectivo", monto: "100.00", registrada_en: "2026-10-05T10:00:00-05:00", registrada_por: "admin" },
    };
    abrirDetalle({ "GET /cotizaciones/7/": [200, confirmada] });
    expect(await screen.findByRole("button", { name: "Cancelar evento" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anular cotización" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bloquear fecha" })).not.toBeInTheDocument();
  });
});
