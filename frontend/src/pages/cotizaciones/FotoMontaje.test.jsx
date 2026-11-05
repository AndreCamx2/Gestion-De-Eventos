import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FotoMontaje from "./FotoMontaje";
import { fotosMontaje, salonesConMontajes } from "./nuevaCotizacion";

const GENERAL = "/montajes/espina_pescado.jpg";
const DEL_SALON = "https://fotos.test/salon.jpg";

const imagen = (container) => container.querySelector("img");

describe("Foto de un montaje", () => {
  it("prefiere la foto del salón y deja la general de respaldo", () => {
    expect(fotosMontaje({ foto_url: DEL_SALON, codigo: "espina_pescado" })).toEqual([DEL_SALON, GENERAL]);
  });

  it("sin foto del salón usa la general del tipo", () => {
    expect(fotosMontaje({ foto_url: "", codigo: "espina_pescado" })).toEqual([GENERAL]);
  });

  it("lleva el código y la foto hasta el selector", () => {
    const [salon] = salonesConMontajes(
      [{ id: 1 }],
      [{ id: 5, codigo: "espina_pescado", nombre: "Espina de pescado" }],
      [{ salon: 1, montaje: 5, aforo: 80, foto_url: DEL_SALON }],
    );
    expect(salon.montajes[0]).toMatchObject({ codigo: "espina_pescado", foto_url: DEL_SALON });
  });

  it("si una foto falla pasa a la siguiente y al final no muestra imagen", () => {
    const { container } = render(<FotoMontaje montaje={{ foto_url: DEL_SALON, codigo: "espina_pescado" }} />);
    expect(imagen(container).getAttribute("src")).toBe(DEL_SALON);

    fireEvent.error(imagen(container));
    expect(imagen(container).getAttribute("src")).toBe(GENERAL);

    fireEvent.error(imagen(container));
    expect(imagen(container)).toBeNull();
  });
});
