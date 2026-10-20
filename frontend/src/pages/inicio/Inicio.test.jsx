import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
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
