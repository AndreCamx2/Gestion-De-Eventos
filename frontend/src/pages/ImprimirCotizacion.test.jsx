import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { simularApi } from "../test/apiFalsa";
import ImprimirCotizacion from "./ImprimirCotizacion";

const COTIZACION = {
  id: 42,
  creado_en: "2026-10-01T10:00:00-05:00",
  validez_oferta: "2026-11-30",
  fecha_evento: "2026-12-10",
  cantidad_personas: 80,
  sitio: { id: 1, nombre: "Hotel Cartagena" },
  cliente: { id: 2, nombre: "María Ríos", identificacion: "1047338221", correo: "maria@example.com" },
  salon: { id: 3, nombre: "Salón Bolívar" },
  montaje: { id: 4, nombre: "Auditorio" },
  aforo: 300,
  items: [{
    id: 5,
    concepto: 6,
    concepto_nombre: "Almuerzo ejecutivo",
    cantidad: 2,
    precio_unitario: "45000.00",
    subtotal: "90000.00",
    impuesto_pct: "8.00",
    impuesto: "7200.00",
    total: "97200.00",
  }],
  subtotal: "90000.00",
  impuestos: "7200.00",
  total: "97200.00",
};

function abrir(rutas) {
  const llamadas = simularApi(rutas);
  render(
    <MemoryRouter initialEntries={["/cotizaciones/42/imprimir"]}>
      <Routes>
        <Route path="/cotizaciones/:id/imprimir" element={<ImprimirCotizacion />} />
      </Routes>
    </MemoryRouter>,
  );
  return llamadas;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Cotización imprimible (SGDE-70)", () => {
  it("adapta el JSON de detalle y muestra los datos y totales de la cotización", async () => {
    abrir({ "GET /cotizaciones/42/": [200, COTIZACION] });

    expect(await screen.findByRole("heading", { name: "Cotización #042" })).toBeInTheDocument();
    expect(screen.getByText("Hotel Cartagena")).toBeInTheDocument();
    expect(screen.getByText("María Ríos")).toBeInTheDocument();
    expect(screen.getByText("maria@example.com")).toBeInTheDocument();
    expect(screen.getByText(/Salón Bolívar · montaje Auditorio/)).toBeInTheDocument();
    expect(screen.getByText("80 personas (aforo 300)")).toBeInTheDocument();
    expect(screen.getByText(/Válida hasta:/)).toHaveTextContent(/30 de noviembre de 2026/);

    const tabla = screen.getByRole("table", { name: "Conceptos cotizados" });
    expect(within(tabla).getByText("Almuerzo ejecutivo")).toBeInTheDocument();
    expect(within(tabla).getByText(/Impoconsumo 8%/)).toHaveTextContent(/7\.200/);
    expect(within(tabla).getByText(/97\.200/)).toBeInTheDocument();
    expect(screen.getByText(/90\.000/)).toBeInTheDocument();
    const totales = screen.getByRole("region", { name: "Totales" });
    expect(within(totales).getByText("Impoconsumo 8%").closest("div")).toHaveTextContent(/7\.200/);
  });

  it("nombra cada impuesto como en el detalle: IVA e Impoconsumo, un renglón por tasa", async () => {
    const conIva = {
      ...COTIZACION,
      items: [
        ...COTIZACION.items,
        {
          id: 6, concepto: 7, concepto_nombre: "Video beam", cantidad: 1, precio_unitario: "250000.00",
          subtotal: "250000.00", impuesto_pct: "19.00", impuesto: "47500.00", total: "297500.00",
        },
      ],
    };
    abrir({ "GET /cotizaciones/42/": [200, conIva] });

    const tabla = await screen.findByRole("table", { name: "Conceptos cotizados" });
    expect(within(tabla).getByText(/IVA 19%/)).toHaveTextContent(/47\.500/);
    expect(within(tabla).getByText(/Impoconsumo 8%/)).toBeInTheDocument();
    const totales = screen.getByRole("region", { name: "Totales" });
    expect(within(totales).getByText("IVA 19%").closest("div")).toHaveTextContent(/47\.500/);
    expect(within(totales).getByText("Impoconsumo 8%").closest("div")).toHaveTextContent(/7\.200/);
    expect(within(totales).queryByText(/^Impuesto/)).not.toBeInTheDocument();
  });

  it("imprime desde el botón y mantiene un enlace de regreso al detalle", async () => {
    abrir({ "GET /cotizaciones/42/": [200, COTIZACION] });
    const imprimir = vi.spyOn(window, "print").mockImplementation(() => {});
    const usuario = userEvent.setup();

    const boton = await screen.findByRole("button", { name: "Imprimir o guardar como PDF" });
    await usuario.click(boton);

    expect(imprimir).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Volver a la cotización" })).toHaveAttribute("href", "/cotizaciones/42");
  });
});
