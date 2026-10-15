import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { simularApi } from "../test/apiFalsa";
import Login from "./Login";

function abrirLogin(onLoginSuccess = vi.fn()) {
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login onLoginSuccess={onLoginSuccess} />} />
        <Route path="/inicio" element={<p>Pantalla de inicio</p>} />
        <Route path="/recuperar-clave" element={<p>Pantalla de recuperar clave</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return { onLoginSuccess, usuario: userEvent.setup() };
}

describe("Login", () => {
  it("con datos correctos guarda la sesión y lleva al inicio", async () => {
    const llamadas = simularApi({ "POST /token/": [200, { access: "acceso-123", refresh: "refresco-456" }] });
    const { usuario, onLoginSuccess } = abrirLogin();

    await usuario.type(screen.getByLabelText(/usuario o correo/i), "admin");
    await usuario.type(screen.getByLabelText(/contraseña/i), "admin-dev-123");
    await usuario.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(await screen.findByText("Pantalla de inicio")).toBeInTheDocument();
    expect(llamadas[0]).toMatchObject({ metodo: "POST", ruta: "/token/", cuerpo: { username: "admin", password: "admin-dev-123" } });
    expect(sessionStorage.getItem("access_token")).toBe("acceso-123");
    expect(sessionStorage.getItem("refresh_token")).toBe("refresco-456");
    expect(onLoginSuccess).toHaveBeenCalledOnce();
  });

  it("con datos incorrectos se queda en el login y avisa", async () => {
    simularApi({ "POST /token/": [401, { detail: "No active account found with the given credentials" }] });
    const { usuario, onLoginSuccess } = abrirLogin();

    await usuario.type(screen.getByLabelText(/usuario o correo/i), "admin");
    await usuario.type(screen.getByLabelText(/contraseña/i), "clave-mala");
    await usuario.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(await screen.findByText("Usuario o contraseña incorrectos.")).toBeInTheDocument();
    expect(screen.queryByText("Pantalla de inicio")).not.toBeInTheDocument();
    expect(sessionStorage.getItem("access_token")).toBeNull();
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it("sin datos no llama al servidor y pide los dos campos", async () => {
    const llamadas = simularApi({});
    const { usuario } = abrirLogin();

    await usuario.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(screen.getByText("Ingresa tu usuario o correo.")).toBeInTheDocument();
    expect(screen.getByText("Ingresa tu contraseña.")).toBeInTheDocument();
    expect(llamadas).toHaveLength(0);
  });

  it("el enlace ¿La olvidaste? lleva a recuperar la contraseña", async () => {
    simularApi({});
    const { usuario } = abrirLogin();

    await usuario.click(screen.getByRole("link", { name: /la olvidaste/i }));

    expect(screen.getByText("Pantalla de recuperar clave")).toBeInTheDocument();
  });
});
