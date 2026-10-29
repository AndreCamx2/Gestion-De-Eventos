import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { simularApi } from "../test/apiFalsa";
import RecuperarClave from "./RecuperarClave";

function abrir() {
  render(
    <MemoryRouter initialEntries={["/recuperar-clave"]}>
      <Routes>
        <Route path="/recuperar-clave" element={<RecuperarClave />} />
        <Route path="/login" element={<p>Pantalla de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe("RecuperarClave", () => {
  it("envía el correo y muestra el mismo aviso exista o no la cuenta", async () => {
    const llamadas = simularApi({ "POST /clave/recuperar/": [200, { detail: "ok" }] });
    const usuario = abrir();

    await usuario.type(screen.getByLabelText(/correo electrónico/i), "ana@correo.com");
    await usuario.click(screen.getByRole("button", { name: /enviar enlace/i }));

    expect(await screen.findByText(/si ese correo está registrado/i)).toBeInTheDocument();
    expect(llamadas[0]).toMatchObject({ metodo: "POST", ruta: "/clave/recuperar/", cuerpo: { email: "ana@correo.com" } });
  });

  it("sin correo o con un correo mal escrito no llama al servidor", async () => {
    const llamadas = simularApi({});
    const usuario = abrir();

    await usuario.click(screen.getByRole("button", { name: /enviar enlace/i }));
    expect(screen.getByText("Ingresa tu correo electrónico.")).toBeInTheDocument();

    await usuario.type(screen.getByLabelText(/correo electrónico/i), "ana@correo");
    await usuario.click(screen.getByRole("button", { name: /enviar enlace/i }));
    expect(screen.getByText(/escribe un correo válido/i)).toBeInTheDocument();

    expect(llamadas).toHaveLength(0);
  });

  it("avisa cuando se hicieron demasiados intentos", async () => {
    simularApi({ "POST /clave/recuperar/": [429, { detail: "Throttled" }] });
    const usuario = abrir();

    await usuario.type(screen.getByLabelText(/correo electrónico/i), "ana@correo.com");
    await usuario.click(screen.getByRole("button", { name: /enviar enlace/i }));

    expect(await screen.findByText(/muchos intentos seguidos/i)).toBeInTheDocument();
  });

  it("tiene un enlace para volver al login", async () => {
    simularApi({});
    const usuario = abrir();

    await usuario.click(screen.getByRole("link", { name: /inicia sesión/i }));

    expect(screen.getByText("Pantalla de login")).toBeInTheDocument();
  });
});
