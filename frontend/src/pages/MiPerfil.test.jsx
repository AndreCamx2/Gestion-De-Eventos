import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import DashboardLayout from "../layouts/DashboardLayout";
import { simularApi } from "../test/apiFalsa";
import MiPerfil from "./MiPerfil";

const YO_CLIENTE = { id: 2, username: "ana@correo.com", first_name: "", email: "ana@correo.com", rol: { codigo: "cliente" }, sitios: [] };
const PERFIL_CLIENTE = {
  rol: "cliente", nombre: "Ana Pérez", tipo: "natural", identificacion: "1047000111", empresa: "",
  telefono: "3001234567", usuario: "ana@correo.com", correo: "ana@correo.com", inicia_con_correo: true,
};
const YO_PROVEEDOR = { id: 3, username: "sonido", first_name: "", email: "sonido@caribe.com", rol: { codigo: "proveedor" }, sitios: [] };
const PERFIL_PROVEEDOR = {
  rol: "proveedor", nombre: "Sonido Caribe", identificacion: "800555", contacto: "Carlos 3005550000",
  usuario: "sonido", correo: "sonido@caribe.com", inicia_con_correo: false,
};

function abrir(rutas) {
  const llamadas = simularApi(rutas);
  render(
    <MemoryRouter>
      <MiPerfil />
    </MemoryRouter>,
  );
  return { usuario: userEvent.setup(), llamadas };
}

const tarjeta = (nombre) => screen.findByRole("region", { name: nombre });
const enviados = (llamadas, metodo) => llamadas.filter((l) => l.metodo === metodo);

describe("Mi perfil (SGDE-133)", () => {
  it("el cliente ve sus datos como texto y edita solo el teléfono", async () => {
    const { usuario, llamadas } = abrir({
      "GET /usuarios/me/": [200, YO_CLIENTE],
      "GET /mi-perfil/": [200, PERFIL_CLIENTE],
      "PATCH /mi-perfil/": ({ cuerpo }) => [200, { ...PERFIL_CLIENTE, ...cuerpo }],
    });
    const datos = within(await tarjeta("Mis datos"));
    expect(await datos.findByText("Ana Pérez")).toBeInTheDocument();
    expect(datos.getByText("1047000111")).toBeInTheDocument();
    expect(datos.queryByRole("textbox", { name: "Nombre" })).not.toBeInTheDocument();
    const guardar = datos.getByRole("button", { name: "Guardar" });
    expect(guardar).toBeDisabled();

    const telefono = datos.getByLabelText("Teléfono");
    await usuario.clear(telefono);
    await usuario.type(telefono, "60-5660 1234");
    expect(telefono).toHaveValue("6056601234");
    await usuario.click(guardar);

    expect(await datos.findByText("Datos actualizados")).toHaveAttribute("role", "status");
    expect(enviados(llamadas, "PATCH")[0].cuerpo).toEqual({ telefono: "6056601234" });
  });

  it("un teléfono inválido no se envía y el error sale bajo el campo", async () => {
    const { usuario, llamadas } = abrir({ "GET /usuarios/me/": [200, YO_CLIENTE], "GET /mi-perfil/": [200, PERFIL_CLIENTE] });
    const datos = within(await tarjeta("Mis datos"));
    const telefono = await datos.findByLabelText("Teléfono");
    await usuario.clear(telefono);
    await usuario.type(telefono, "12345");
    await usuario.click(datos.getByRole("button", { name: "Guardar" }));

    expect(telefono).toHaveAccessibleDescription("Escribe un celular de 10 dígitos o un fijo que empiece por 60.");
    expect(enviados(llamadas, "PATCH")).toHaveLength(0);
  });

  it("el proveedor edita su contacto y ve con qué usuario inicia sesión", async () => {
    const { usuario, llamadas } = abrir({
      "GET /usuarios/me/": [200, YO_PROVEEDOR],
      "GET /mi-perfil/": [200, PERFIL_PROVEEDOR],
      "PATCH /mi-perfil/": ({ cuerpo }) => [200, { ...PERFIL_PROVEEDOR, ...cuerpo }],
    });
    const datos = within(await tarjeta("Mis datos"));
    const contacto = await datos.findByLabelText("Contacto");
    await usuario.clear(contacto);
    await usuario.type(contacto, "  Marta 3014445555 ");
    await usuario.click(datos.getByRole("button", { name: "Guardar" }));

    expect(await datos.findByText("Datos actualizados")).toBeInTheDocument();
    expect(enviados(llamadas, "PATCH")[0].cuerpo).toEqual({ contacto: "Marta 3014445555" });
    expect(within(await tarjeta("Correo de acceso")).getByText(/Inicias sesión con tu usuario/)).toHaveTextContent("sonido");
  });

  it("el proveedor sin vincular ve un aviso y aún puede cambiar su correo y contraseña", async () => {
    abrir({
      "GET /usuarios/me/": [200, YO_PROVEEDOR],
      "GET /mi-perfil/": [403, { detail: "x", codigo: "proveedor_sin_vincular" }],
    });
    expect(await screen.findByText("Tu usuario todavía no está vinculado")).toBeInTheDocument();
    expect(await tarjeta("Correo de acceso")).toBeInTheDocument();
    expect(await tarjeta("Contraseña")).toBeInTheDocument();
  });

  it("el error 400 del backend sale bajo su campo", async () => {
    const { usuario } = abrir({
      "GET /usuarios/me/": [200, YO_CLIENTE],
      "GET /mi-perfil/": [200, PERFIL_CLIENTE],
      "POST /mi-perfil/correo/": [400, { password_actual: ["La contraseña actual no es correcta."] }],
    });
    const correo = within(await tarjeta("Correo de acceso"));
    expect(correo.getByText("Con este correo vas a iniciar sesión.")).toBeInTheDocument();
    await usuario.type(correo.getByLabelText("Correo nuevo"), "nueva@correo.com");
    await usuario.type(correo.getByLabelText("Contraseña actual"), "mala-clave-1");
    await usuario.click(correo.getByRole("button", { name: "Guardar" }));

    expect(await correo.findByText("La contraseña actual no es correcta.")).toBeInTheDocument();
    expect(correo.getByLabelText("Contraseña actual")).toHaveAccessibleDescription("La contraseña actual no es correcta.");
  });

  it("cambia el correo y muestra el nuevo", async () => {
    const { usuario } = abrir({
      "GET /usuarios/me/": [200, YO_CLIENTE],
      "GET /mi-perfil/": [200, PERFIL_CLIENTE],
      "POST /mi-perfil/correo/": [200, { detail: "ok", usuario: "nueva@correo.com", correo: "nueva@correo.com", inicia_con_correo: true }],
    });
    const correo = within(await tarjeta("Correo de acceso"));
    await usuario.type(correo.getByLabelText("Correo nuevo"), "nueva@correo.com");
    await usuario.type(correo.getByLabelText("Contraseña actual"), "Clave-Segura-123");
    await usuario.click(correo.getByRole("button", { name: "Guardar" }));

    expect(await correo.findByText("Correo actualizado")).toBeInTheDocument();
    expect(correo.getByText("nueva@correo.com")).toBeInTheDocument();
    expect(correo.getByLabelText("Correo nuevo")).toHaveValue("");
  });

  it("contraseñas que no coinciden no se envían", async () => {
    const { usuario, llamadas } = abrir({ "GET /usuarios/me/": [200, YO_CLIENTE], "GET /mi-perfil/": [200, PERFIL_CLIENTE] });
    const clave = within(await tarjeta("Contraseña"));
    await usuario.type(clave.getByLabelText("Contraseña actual"), "Clave-Segura-123");
    await usuario.type(clave.getByLabelText("Contraseña nueva"), "Nueva-Clave-789");
    await usuario.type(clave.getByLabelText("Confirmar contraseña nueva"), "Nueva-Clave-788");
    await usuario.click(clave.getByRole("button", { name: "Guardar" }));

    expect(clave.getByLabelText("Confirmar contraseña nueva")).toHaveAccessibleDescription("Las contraseñas no coinciden.");
    expect(enviados(llamadas, "POST")).toHaveLength(0);
  });

  it("cambia la contraseña, guarda los tokens nuevos y limpia los campos", async () => {
    const { usuario, llamadas } = abrir({
      "GET /usuarios/me/": [200, YO_CLIENTE],
      "GET /mi-perfil/": [200, PERFIL_CLIENTE],
      "POST /mi-perfil/contrasena/": [200, { detail: "ok", access: "acceso-nuevo", refresh: "refresh-nuevo" }],
    });
    const clave = within(await tarjeta("Contraseña"));
    await usuario.type(clave.getByLabelText("Contraseña actual"), "Clave-Segura-123");
    await usuario.type(clave.getByLabelText("Contraseña nueva"), "Nueva-Clave-789");
    await usuario.type(clave.getByLabelText("Confirmar contraseña nueva"), "Nueva-Clave-789");
    await usuario.click(clave.getByRole("button", { name: "Guardar" }));

    expect(await clave.findByText("Contraseña cambiada")).toHaveAttribute("role", "status");
    expect(enviados(llamadas, "POST")[0].cuerpo).toEqual({ password_actual: "Clave-Segura-123", password_nueva: "Nueva-Clave-789" });
    expect(sessionStorage.getItem("access_token")).toBe("acceso-nuevo");
    expect(sessionStorage.getItem("refresh_token")).toBe("refresh-nuevo");
    for (const campo of ["Contraseña actual", "Contraseña nueva", "Confirmar contraseña nueva"]) {
      expect(clave.getByLabelText(campo)).toHaveValue("");
    }
  });
});

describe("Menú: Mi perfil", () => {
  function menu(role) {
    render(
      <MemoryRouter initialEntries={["/inicio"]}>
        <DashboardLayout user={{ name: "Prueba", role }} onLogout={() => {}} />
      </MemoryRouter>,
    );
  }

  it("el administrador no lo ve", () => {
    menu("administrador");
    expect(screen.queryByRole("link", { name: "Mi perfil" })).not.toBeInTheDocument();
  });

  it.each(["cliente", "proveedor"])("el %s sí lo ve", (role) => {
    menu(role);
    expect(screen.getAllByRole("link", { name: "Mi perfil" })[0]).toHaveAttribute("href", "/mi-perfil");
  });
});
