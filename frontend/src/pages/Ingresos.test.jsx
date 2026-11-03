import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { simularApi } from "../test/apiFalsa";
import Ingresos from "./Ingresos";

const RUTA = "GET /reportes/ingresos-por-tipo-evento/";

// Respuesta como la de GET /api/reportes/ingresos-por-tipo-evento/ (SGDE-144).
const RESPUESTA = {
  gran_total: "30000000.00",
  total_eventos: 6,
  ticket_promedio: "5000000.00",
  detalle: [
    { tipo_evento_id: 13, tipo_evento_nombre: "Boda", grupo_evento_nombre: "Social", cantidad_eventos: 2, ingreso_total: "12000000.00", porcentaje_ingreso: 40 },
    { tipo_evento_id: 1, tipo_evento_nombre: "Reunión corporativa", grupo_evento_nombre: "Reuniones", cantidad_eventos: 2, ingreso_total: "9000000.00", porcentaje_ingreso: 30 },
    { tipo_evento_id: 14, tipo_evento_nombre: "Quince años o cumpleaños", grupo_evento_nombre: "Social", cantidad_eventos: 1, ingreso_total: "6000000.00", porcentaje_ingreso: 20 },
    { tipo_evento_id: null, tipo_evento_nombre: "Sin clasificar", grupo_evento_nombre: "Sin clasificar", cantidad_eventos: 1, ingreso_total: "3000000.00", porcentaje_ingreso: 10 },
  ],
};

const VACIO = { gran_total: "0.00", total_eventos: 0, ticket_promedio: "0.00", detalle: [] };

function abrir() {
  render(
    <MemoryRouter>
      <Ingresos />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

const parametros = (llamada) => Object.fromEntries(new URLSearchParams(llamada.search));

describe("¿Qué eventos generan más ingresos? (SGDE-145)", () => {
  it("muestra cada grupo de mayor a menor con monto, eventos, porcentaje y ticket promedio", async () => {
    const llamadas = simularApi({ [RUTA]: [200, RESPUESTA] });
    abrir();

    const filas = await screen.findAllByRole("listitem");
    expect(filas.map((f) => within(f).getByText(/Social|Reuniones|Sin clasificar/).textContent)).toEqual([
      "Social",
      "Reuniones",
      "Sin clasificar",
    ]);
    const social = within(filas[0]);
    expect(social.getByText("$ 18.000.000")).toBeInTheDocument();
    expect(social.getByText("3 eventos")).toBeInTheDocument();
    expect(social.getByText("60 %")).toBeInTheDocument();
    expect(social.getByText("$ 6.000.000")).toBeInTheDocument();
    expect(within(filas[1]).getByText("$ 4.500.000")).toBeInTheDocument(); // ticket de Reuniones

    // Resumen del periodo
    expect(screen.getByText("$ 30 M")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();

    expect(screen.getByText("$ 5 M")).toBeInTheDocument(); // ticket promedio del API

    // Por defecto: este mes
    expect(parametros(llamadas[0]).desde).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it("\"Ver por: tipo de evento\" muestra cada tipo con su grupo, sin volver a llamar al API", async () => {
    const llamadas = simularApi({ [RUTA]: [200, RESPUESTA] });
    const user = abrir();
    await screen.findByText("Reuniones");

    await user.click(screen.getByRole("button", { name: "Tipo de evento" }));

    const filas = screen.getAllByRole("listitem");
    expect(within(filas[0]).getByText("Boda")).toBeInTheDocument();
    expect(within(filas[0]).getByText("Social")).toBeInTheDocument();
    expect(within(filas[0]).getByText("$ 12.000.000")).toBeInTheDocument();
    expect(filas).toHaveLength(4);
    expect(llamadas).toHaveLength(1);
  });

  it("\"Este año\" pide del 1 de enero al 31 de diciembre", async () => {
    const llamadas = simularApi({ [RUTA]: [200, RESPUESTA] });
    const user = abrir();
    await screen.findByText("Reuniones");

    await user.click(screen.getByRole("button", { name: "Este año" }));

    const anio = new Date().getFullYear();
    await screen.findByText("Reuniones");
    expect(parametros(llamadas.at(-1))).toMatchObject({ desde: `${anio}-01-01`, hasta: `${anio}-12-31` });
  });

  it("con un rango, no consulta hasta tener las dos fechas y luego las envía", async () => {
    const llamadas = simularApi({ [RUTA]: [200, RESPUESTA] });
    const user = abrir();
    await screen.findByText("Reuniones");
    const antes = llamadas.length;

    await user.click(screen.getByRole("button", { name: "Rango de fechas" }));
    expect(await screen.findByText("Elige la fecha inicial y la final.")).toBeInTheDocument();
    expect(llamadas.length).toBe(antes);

    await user.type(screen.getByLabelText("Evento desde"), "2026-03-01");
    await user.type(screen.getByLabelText("hasta"), "2026-05-31");

    await screen.findByText("Reuniones");
    expect(parametros(llamadas.at(-1))).toMatchObject({ desde: "2026-03-01", hasta: "2026-05-31" });
  });

  it("sin eventos confirmados en el periodo muestra el estado vacío", async () => {
    simularApi({ [RUTA]: [200, VACIO] });
    abrir();
    expect(await screen.findByText("No hay eventos confirmados en este periodo")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("si el API falla, ofrece reintentar", async () => {
    simularApi({ [RUTA]: [500, { detail: "Error" }] });
    abrir();
    expect(await screen.findByText("No pudimos hablar con el servidor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
