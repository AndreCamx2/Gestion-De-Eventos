import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { simularApi } from "../test/apiFalsa";
import Usuarios from "./Usuarios";

const ROLES = [
  { id: 1, codigo: "administrador", nombre: "Administrador" },
  { id: 2, codigo: "proveedor", nombre: "Proveedor" },
  { id: 3, codigo: "cliente", nombre: "Cliente" },
];

const SITIOS = [{ id: 7, nombre: "Hotel Caribe" }];

const YO = {
  id: 1, username: "laura", first_name: "Laura", last_name: "Gómez", email: "laura@sgde.co",
  rol: 1, rol_codigo: "administrador", sitios: [7], is_active: true, last_login: null,
};

const PROVEEDOR = {
  id: 2, username: "luces", first_name: "Luces", last_name: "Bocagrande", email: "luces@sgde.co",
  rol: 2, rol_codigo: "proveedor", sitios: [], is_active: true, last_login: null,
};

function rutasBase(extra = {}) {
  return {
    "GET /usuarios/": [200, [YO, PROVEEDOR]],
    "GET /roles/": [200, ROLES],
    "GET /sitios/": [200, SITIOS],
    "GET /usuarios/me/": [200, YO],
    ...extra,
  };
}

function abrirUsuarios() {
  render(
    <MemoryRouter>
      <Usuarios />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe("Usuarios", () => {
  it("lista los usuarios, marca quién soy y no me deja darme de baja", async () => {
    simularApi(rutasBase());
    abrirUsuarios();

    const miFila = (await screen.findByText("Laura Gómez")).closest("tr");
    expect(within(miFila).getByText("Tú")).toBeInTheDocument();
    expect(within(miFila).getByRole("button", { name: "No puedes darte de baja a ti mismo." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Dar de baja a Luces Bocagrande" })).toBeEnabled();
    expect(screen.queryByRole("radio", { name: "Cliente" })).not.toBeInTheDocument();
  });

  it("crea un proveedor y lo agrega a la tabla", async () => {
    const llamadas = simularApi(
      rutasBase({
        "POST /usuarios/": ({ cuerpo }) => [201, { id: 9, ...cuerpo, password: undefined }],
      }),
    );
    const usuario = abrirUsuarios();
    await screen.findByText("Laura Gómez");

    await usuario.type(screen.getByLabelText("Usuario"), "sonido.cartagena");
    await usuario.type(screen.getByLabelText("Correo"), "sonido@sgde.co");
    await usuario.click(screen.getByRole("checkbox", { name: "Hotel Caribe" }));
    await usuario.type(screen.getByLabelText("Contraseña temporal"), "Piedra-viva-2026");
    await usuario.click(screen.getByRole("button", { name: "Crear usuario" }));

    expect(await screen.findByText(/Usuario "sonido.cartagena" creado/)).toBeInTheDocument();
    const post = llamadas.find((l) => l.metodo === "POST");
    expect(post.cuerpo).toMatchObject({ username: "sonido.cartagena", rol: 2, sitios: [7] });
  });

  it("muestra el error del servidor al dar de baja al último administrador", async () => {
    simularApi(
      rutasBase({
        "DELETE /usuarios/2/": [400, { detail: ["Debe quedar al menos un administrador activo."] }],
      }),
    );
    const usuario = abrirUsuarios();

    await usuario.click(await screen.findByRole("button", { name: "Dar de baja a Luces Bocagrande" }));
    const ventana = screen.getByRole("dialog");
    await usuario.click(within(ventana).getByRole("button", { name: "Dar de baja" }));

    expect(await within(ventana).findByRole("alert")).toHaveTextContent("Debe quedar al menos un administrador activo.");
  });

  it("da de baja a un proveedor y lo saca de la lista", async () => {
    simularApi(rutasBase({ "DELETE /usuarios/2/": [204, undefined] }));
    const usuario = abrirUsuarios();

    await usuario.click(await screen.findByRole("button", { name: "Dar de baja a Luces Bocagrande" }));
    await usuario.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Dar de baja" }));

    expect(await screen.findByText(/"luces" quedó dado de baja/)).toBeInTheDocument();
    expect(screen.queryByText("Luces Bocagrande")).not.toBeInTheDocument();
  });
});
