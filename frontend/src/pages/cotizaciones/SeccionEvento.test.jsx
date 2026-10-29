import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SeccionEvento from "./SeccionEvento";

describe("Selector de tipo de evento", () => {
  it("muestra los tipos agrupados y reporta el campo seleccionado", () => {
    const c = {
      salones: [],
      salon: null,
      montaje: null,
      form: {
        tipo_evento: "",
        cantidad_personas: "",
        fecha_evento: "",
        validez_oferta: "",
      },
      tiposEvento: [
        { id: 1, nombre: "Reuniones", tipos: [{ id: 10, nombre: "Reunión de trabajo" }] },
        { id: 2, nombre: "Social", tipos: [{ id: 20, nombre: "Boda" }] },
      ],
      errores: { campos: {}, lineas: [], general: null },
      aforo: { excede: false, texto: "Elige un montaje para ver el aforo." },
      avisoOcupacion: null,
    };
    c.cambiarCampo = vi.fn((evento) => {
      c.form[evento.target.name] = evento.target.value;
    });

    render(<SeccionEvento c={c} />);
    const selector = screen.getByRole("combobox", { name: "Tipo de evento" });
    expect(selector).toBeRequired();
    expect(screen.getByRole("group", { name: "Social" })).toContainElement(
      screen.getByRole("option", { name: "Boda" }),
    );

    fireEvent.change(selector, { target: { name: "tipo_evento", value: "20" } });
    expect(c.cambiarCampo).toHaveBeenCalledOnce();
    expect(c.form.tipo_evento).toBe("20");
  });
});
