import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { simularApi } from "../test/apiFalsa";
import Clientes from "./Clientes";

const EMPRESAS = [{ id: 1, razon_social: "Hotel Caribe S.A.S.", identificacion: "900111222-3" }];

const CLIENTES = [
  {
    id: 1, tipo: "natural", nombre: "María Fernanda Ríos", identificacion: "1047338221", telefono: "",
    correo: "mf@correo.co", empresa: null, forma_pago: "", observaciones_internas: "", activo: true,
    creado_en: "2026-09-01T10:00:00-05:00", cotizaciones: [],
  },
  {
    id: 2, tipo: "juridica", nombre: "Hotel Caribe", identificacion: null, telefono: "",
    correo: "eventos@caribe.co", empresa: 1, forma_pago: "", observaciones_internas: "", activo: true,
    creado_en: "2026-09-02T10:00:00-05:00", cotizaciones: [],
  },
];

function abrirClientes() {
  render(
    <MemoryRouter>
      <Clientes />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe("Clientes", () => {
  it("muestra la lista que devuelve el API, con el NIT de la empresa en los jurídicos", async () => {
    simularApi({ "GET /clientes/": [200, CLIENTES], "GET /empresas/": [200, EMPRESAS] });
    abrirClientes();

    const fila = (await screen.findByText("Hotel Caribe")).closest("tr");
    expect(screen.getByText("María Fernanda Ríos")).toBeInTheDocument();
    expect(within(fila).getByText("900111222-3")).toBeInTheDocument();
  });

  it("si el servidor falla, avisa en vez de mostrar una lista vacía", async () => {
    simularApi({ "GET /clientes/": [500, { detail: "Error" }], "GET /empresas/": [200, EMPRESAS] });
    abrirClientes();

    expect(await screen.findByText("No pudimos hablar con el servidor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("crea una empresa desde el formulario y la deja elegida en el cliente (SGDE-53)", async () => {
    const llamadas = simularApi({
      "GET /clientes/": [200, CLIENTES],
      "GET /empresas/": [200, EMPRESAS],
      "GET /ciudades/": [200, [{ id: 1, codigo: "CTG", nombre: "Cartagena" }]],
      "POST /empresas/": ({ cuerpo }) =>
        cuerpo.identificacion === "900111222-3"
          ? [400, { identificacion: ["Ya existe empresa con este identificacion."] }]
          : [201, { id: 2, ...cuerpo }],
    });
    const usuario = abrirClientes();

    await screen.findByText("Hotel Caribe");
    await usuario.click(screen.getAllByRole("button", { name: /nuevo cliente/i })[0]);
    await usuario.selectOptions(screen.getByLabelText("Tipo"), "juridica");
    await usuario.click(screen.getByRole("button", { name: /crear empresa nueva/i }));

    const ventana = await screen.findByRole("dialog", { name: "Nueva empresa" });
    await usuario.type(within(ventana).getByLabelText("Razón social"), "Eventos del Mar S.A.S.");
    await usuario.type(within(ventana).getByLabelText("NIT"), "900111222-3");
    await usuario.click(within(ventana).getByRole("button", { name: "Crear empresa" }));
    expect(await within(ventana).findByText(/ya existe una empresa con ese nit/i)).toBeInTheDocument();

    await usuario.clear(within(ventana).getByLabelText("NIT"));
    await usuario.type(within(ventana).getByLabelText("NIT"), "901555666-1");
    await usuario.click(within(ventana).getByRole("button", { name: "Crear empresa" }));

    expect(await screen.findByText(/creada y asignada/i)).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Nueva empresa" })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/empresa \(obligatoria\)/i)).toHaveDisplayValue("Eventos del Mar S.A.S.");
    expect(llamadas.filter((l) => l.metodo === "POST" && l.ruta === "/empresas/")).toHaveLength(2);
  });
});
