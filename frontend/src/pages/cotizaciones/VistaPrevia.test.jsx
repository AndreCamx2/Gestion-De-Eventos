import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ResumenCotizacion from "./ResumenCotizacion";
import { totalesCotizacion, totalesLinea } from "./nuevaCotizacion";

const CONCEPTO = { id: 6, nombre: "Almuerzo ejecutivo", precio: "45000.00", impuesto_pct: "8.00", activo: true, sitio: 1 };
const LINEAS = [{ concepto: CONCEPTO, cantidad: "2" }];

const C = {
  form: {
    cliente: { id: 2, nombre: "María Ríos", identificacion: "1047338221", correo: "maria@example.com" },
    fecha_evento: "2026-12-10",
    cantidad_personas: "80",
    validez_oferta: "",
  },
  salon: { id: 3, nombre: "Salón Bolívar", sitio: 1, sitio_nombre: "Hotel Cartagena" },
  montaje: { id: 4, nombre: "Auditorio", aforo: 300 },
  vigencia: "2026-11-30",
  lineas: LINEAS.map((l) => ({ ...l, ...totalesLinea(l.cantidad, CONCEPTO.precio, CONCEPTO.impuesto_pct) })),
  totales: totalesCotizacion(LINEAS),
  errores: { tipo: null, general: null, campos: {}, lineas: [] },
  guardando: false,
};

describe("Vista previa para el cliente", () => {
  it("muestra la hoja de la cotización que se está armando y se cierra", async () => {
    const usuario = userEvent.setup();
    render(<ResumenCotizacion c={C} />);

    await usuario.click(screen.getByRole("button", { name: "Vista previa para el cliente" }));

    const dialogo = screen.getByRole("dialog", { name: "Vista previa para el cliente" });
    expect(dialogo).toHaveTextContent("Cotización (borrador)");
    expect(dialogo).toHaveTextContent("Hotel Cartagena");
    expect(dialogo).toHaveTextContent("María Ríos");
    expect(dialogo).toHaveTextContent("80 personas (aforo 300)");
    expect(dialogo).toHaveTextContent("Almuerzo ejecutivo");
    expect(dialogo).toHaveTextContent(/97\.200/);

    await usuario.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
