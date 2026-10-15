import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { simularApi } from "../test/apiFalsa";
import RestablecerClave from "./RestablecerClave";

function abrir(ruta = "/restablecer-clave?uid=MQ&token=abc-123") {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/restablecer-clave" element={<RestablecerClave />} />
        <Route path="/login" element={<p>Pantalla de login</p>} />
        <Route path="/recuperar-clave" element={<p>Pedir enlace</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

async function escribirClaves(usuario, password, confirmacion = password) {
  await usuario.type(screen.getByLabelText("Nueva contraseña *"), password);
  await usuario.type(screen.getByLabelText("Confirmar contraseña *"), confirmacion);
  await usuario.click(screen.getByRole("button", { name: /guardar contraseña/i }));
}

describe("RestablecerClave", () => {
  it("guarda la clave nueva con los datos del enlace y lleva al login", async () => {
    const llamadas = simularApi({ "POST /clave/restablecer/": [200, { detail: "ok" }] });
    const usuario = abrir();

    await escribirClaves(usuario, "Otra-Clave-Larga-456");

    expect(await screen.findByText(/tu contraseña quedó cambiada/i)).toBeInTheDocument();
    expect(llamadas[0]).toMatchObject({
      metodo: "POST",
      ruta: "/clave/restablecer/",
      cuerpo: { uid: "MQ", token: "abc-123", password: "Otra-Clave-Larga-456" },
    });

    await usuario.click(screen.getByRole("link", { name: /iniciar sesión/i }));
    expect(screen.getByText("Pantalla de login")).toBeInTheDocument();
  });

  it("si las claves no coinciden o son cortas no llama al servidor", async () => {
    const llamadas = simularApi({});
    const usuario = abrir();

    await escribirClaves(usuario, "corta", "otra");

    expect(screen.getByText("Debe tener mínimo 8 caracteres.")).toBeInTheDocument();
    expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
    expect(llamadas).toHaveLength(0);
  });

  it("muestra los avisos del servidor cuando la clave es débil", async () => {
    simularApi({ "POST /clave/restablecer/": [400, { password: ["Esta contraseña es demasiado común."] }] });
    const usuario = abrir();

    await escribirClaves(usuario, "password123");

    expect(await screen.findByText("Esta contraseña es demasiado común.")).toBeInTheDocument();
  });

  it("si el enlace venció ofrece pedir uno nuevo", async () => {
    simularApi({ "POST /clave/restablecer/": [400, { detail: "El enlace no es válido o ya venció." }] });
    const usuario = abrir();

    await escribirClaves(usuario, "Otra-Clave-Larga-456");

    await usuario.click(await screen.findByRole("link", { name: /pedir un enlace nuevo/i }));
    expect(screen.getByText("Pedir enlace")).toBeInTheDocument();
  });

  it("sin uid o token en la dirección avisa de una vez que el enlace no sirve", () => {
    simularApi({});
    abrir("/restablecer-clave");

    expect(screen.getByText(/este enlace no es válido/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Nueva contraseña *")).not.toBeInTheDocument();
  });
});
