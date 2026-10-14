import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ProtectedRoute, RoleRoute } from "./guards";
import { rolesDeRuta } from "./rutasPorRol";

const ADMIN = { name: "Admin", role: "administrador" };
const CLIENTE = { name: "Cliente", role: "cliente" };

function abrir(ruta, user) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/login" element={<p>Pantalla de login</p>} />
        <Route element={<ProtectedRoute user={user} cargando={false} />}>
          <Route element={<RoleRoute user={user} />}>
            <Route path="/inicio" element={<p>Pantalla de inicio</p>} />
            <Route path="/clientes" element={<p>Pantalla de clientes</p>} />
            <Route path="/cotizaciones/:id" element={<p>Detalle de cotización</p>} />
            <Route path="/sin-roles" element={<p>Pantalla sin roles</p>} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Redirección por rol", () => {
  it("sin sesión manda al login", () => {
    abrir("/clientes", null);
    expect(screen.getByText("Pantalla de login")).toBeInTheDocument();
  });

  it("el administrador entra a Clientes", () => {
    abrir("/clientes", ADMIN);
    expect(screen.getByText("Pantalla de clientes")).toBeInTheDocument();
  });

  it("un cliente no entra a Clientes: lo manda al inicio", () => {
    abrir("/clientes", CLIENTE);
    expect(screen.getByText("Pantalla de inicio")).toBeInTheDocument();
    expect(screen.queryByText("Pantalla de clientes")).not.toBeInTheDocument();
  });

  it("las subrutas heredan los roles: un cliente no abre el detalle de una cotización", () => {
    abrir("/cotizaciones/12", CLIENTE);
    expect(screen.getByText("Pantalla de inicio")).toBeInTheDocument();
  });

  it("una ruta sin roles declarados no la ve nadie, ni el administrador", () => {
    abrir("/sin-roles", ADMIN);
    expect(screen.getByText("Pantalla de inicio")).toBeInTheDocument();
  });
});

describe("rolesDeRuta", () => {
  it("coincide por tramos completos de la ruta", () => {
    expect(rolesDeRuta("/cotizaciones/nueva")).toEqual(["administrador"]);
    expect(rolesDeRuta("/cotizaciones-viejas")).toEqual([]);
    expect(rolesDeRuta("/inicio/")).toContain("cliente");
  });
});
