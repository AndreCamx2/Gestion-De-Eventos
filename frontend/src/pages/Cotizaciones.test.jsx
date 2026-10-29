import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { simularApi } from "../test/apiFalsa";
import Cotizaciones from "./Cotizaciones";

const COTIZACIONES = [
  {
    id: 7,
    estado: "cotizado",
    vencida: false,
    cliente_nombre: "María Ríos",
    salon_nombre: "Salón Bolívar",
    montaje_nombre: "Auditorio",
    fecha_evento: "2099-12-10",
    cantidad_personas: 80,
    validez_oferta: "2099-11-30",
    total: "97200.00",
    tipo_evento: { id: 10, nombre: "Reunión de trabajo", grupo: { id: 1, nombre: "Reuniones" } },
    grupo_evento: { id: 1, nombre: "Reuniones" },
  },
  {
    id: 8,
    estado: "cotizado",
    vencida: false,
    cliente_nombre: "Cliente antiguo",
    salon_nombre: "Salón Bolívar",
    montaje_nombre: "Auditorio",
    fecha_evento: "2099-12-11",
    cantidad_personas: 30,
    validez_oferta: "2099-11-30",
    total: "50000.00",
    tipo_evento: null,
    grupo_evento: null,
  },
];

const GRUPOS = [
  { id: 1, nombre: "Reuniones", tipos: [{ id: 10, nombre: "Reunión de trabajo" }] },
  { id: 2, nombre: "Social", tipos: [{ id: 20, nombre: "Boda" }] },
];

function abrirCotizaciones() {
  const llamadas = simularApi({
    "GET /tipos-evento/": [200, GRUPOS],
    "GET /cotizaciones/": ({ search }) => {
      const params = new URLSearchParams(search);
      return [200, params.has("grupo_evento") || params.has("tipo_evento") ? [COTIZACIONES[0]] : COTIZACIONES];
    },
  });
  render(
    <MemoryRouter initialEntries={["/cotizaciones"]}>
      <Routes>
        <Route path="/cotizaciones" element={<Cotizaciones />} />
      </Routes>
    </MemoryRouter>,
  );
  return { llamadas, usuario: userEvent.setup() };
}

describe("Listado de cotizaciones y tipo de evento (SGDE-143)", () => {
  it("muestra el tipo y clasifica las cotizaciones antiguas sin tipo", async () => {
    abrirCotizaciones();

    const region = await screen.findByRole("region", { name: "Listado de cotizaciones" });
    const tabla = within(region).getByRole("table");
    expect(within(tabla).getByText("Reunión de trabajo")).toBeInTheDocument();
    expect(within(tabla).getByText("Sin clasificar")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Tipo de evento" })).toBeInTheDocument();
  });

  it("filtra en backend por grupo y por tipo, limitando tipos al grupo elegido", async () => {
    const { llamadas, usuario } = abrirCotizaciones();
    const grupo = await screen.findByRole("combobox", { name: "Grupo de evento" });
    const tipo = screen.getByRole("combobox", { name: "Tipo de evento" });

    await usuario.selectOptions(grupo, "1");
    await waitFor(() => {
      expect(llamadas.some(({ search }) => new URLSearchParams(search).get("grupo_evento") === "1")).toBe(true);
    });
    expect(screen.getByRole("option", { name: "Reunión de trabajo" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Boda" })).not.toBeInTheDocument();

    await usuario.selectOptions(tipo, "10");
    await waitFor(() => {
      expect(llamadas.some(({ search }) => {
        const params = new URLSearchParams(search);
        return params.get("grupo_evento") === "1" && params.get("tipo_evento") === "10";
      })).toBe(true);
    });
  });
});
