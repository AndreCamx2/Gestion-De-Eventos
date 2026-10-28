import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { simularApi } from "../test/apiFalsa";
import Registrar from "./Registrar";

function abrirRegistro() {
  render(
    <MemoryRouter initialEntries={["/registro"]}>
      <Routes>
        <Route path="/registro" element={<Registrar />} />
        <Route path="/login" element={<p>Pantalla de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

async function llenarNatural(usuario, cambios = {}) {
  const datos = {
    nombre: "María Bustamante",
    documento: "1045678",
    telefono: "3001234567",
    correo: "maria@correo.com",
    clave: "Salones2026",
    ...cambios,
  };
  await usuario.type(screen.getByLabelText(/nombre completo/i), datos.nombre);
  await usuario.type(screen.getByLabelText(/cédula/i), datos.documento);
  await usuario.type(screen.getByLabelText(/teléfono/i), datos.telefono);
  await usuario.type(screen.getByLabelText(/correo electrónico/i), datos.correo);
  await usuario.type(screen.getByLabelText(/^contraseña/i), datos.clave);
  await usuario.type(screen.getByLabelText(/confirmar contraseña/i), datos.clave);
}

describe("Registrar", () => {
  it("la cédula no deja escribir letras", async () => {
    const usuario = abrirRegistro();

    await usuario.type(screen.getByLabelText(/cédula/i), "12ab34");

    expect(screen.getByLabelText(/cédula/i)).toHaveValue("1234");
  });

  it("no envía un nombre con números y avisa debajo del campo", async () => {
    const llamadas = simularApi({ "POST /registro/": [201, {}] });
    const usuario = abrirRegistro();

    await llenarNatural(usuario, { nombre: "Juan123 Pérez" });
    await usuario.click(screen.getByLabelText(/tratamiento de mis datos/i));
    await usuario.click(screen.getByRole("button", { name: /crear mi cuenta/i }));

    expect(screen.getByText("Solo letras, sin números ni símbolos.")).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre completo/i)).toHaveFocus();
    expect(llamadas).toHaveLength(0);
  });

  it("exige autorizar el tratamiento de datos", async () => {
    const llamadas = simularApi({ "POST /registro/": [201, {}] });
    const usuario = abrirRegistro();

    await llenarNatural(usuario);
    await usuario.click(screen.getByRole("button", { name: /crear mi cuenta/i }));

    expect(screen.getByText(/debes autorizar el tratamiento/i)).toBeInTheDocument();
    expect(llamadas).toHaveLength(0);
  });

  it("rechaza un NIT con el dígito de verificación equivocado", async () => {
    const usuario = abrirRegistro();

    await usuario.click(screen.getByRole("tab", { name: /empresa/i }));
    await usuario.type(screen.getByLabelText(/^nit/i), "900123456-7");
    await usuario.tab();

    expect(screen.getByText(/dígito de verificación no corresponde/i)).toBeInTheDocument();
  });

  it("con datos válidos envía los datos limpios", async () => {
    const llamadas = simularApi({ "POST /registro/": [201, { id: 1 }] });
    const usuario = abrirRegistro();

    await llenarNatural(usuario, { nombre: "  María   Bustamante", telefono: "300 123 4567", correo: "Maria@Correo.com" });
    await usuario.click(screen.getByLabelText(/tratamiento de mis datos/i));
    await usuario.click(screen.getByRole("button", { name: /crear mi cuenta/i }));

    expect(await screen.findByText(/cuenta creada correctamente/i)).toBeInTheDocument();
    expect(llamadas[0].cuerpo).toMatchObject({
      nombre: "María Bustamante",
      identificacion: "1045678",
      telefono: "3001234567",
      email: "maria@correo.com",
    });
  });

  it("muestra el error del backend en el campo del teléfono", async () => {
    simularApi({ "POST /registro/": [400, { telefono: ["Escribe un celular de 10 dígitos."] }] });
    const usuario = abrirRegistro();

    await llenarNatural(usuario);
    await usuario.click(screen.getByLabelText(/tratamiento de mis datos/i));
    await usuario.click(screen.getByRole("button", { name: /crear mi cuenta/i }));

    expect(await screen.findByText("Escribe un celular de 10 dígitos.")).toBeInTheDocument();
  });
});
