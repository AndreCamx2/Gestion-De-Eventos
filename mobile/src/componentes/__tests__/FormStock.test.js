import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import FormStock from "../FormStock";
import { ErrorApi } from "../../api/cliente";

describe("FormStock", () => {
  it("sin datos no llama al API y avisa bajo cada campo", async () => {
    const guardar = jest.fn();
    await render(<FormStock conNombre tituloBoton="Agregar" guardar={guardar} alGuardar={jest.fn()} />);

    await fireEvent.press(screen.getByRole("button", { name: "Agregar" }));

    expect(await screen.findByText("Escribe el nombre del elemento.")).toBeTruthy();
    expect(screen.getByText(/cantidad entera/)).toBeTruthy();
    expect(guardar).not.toHaveBeenCalled();
  });

  it("con datos válidos guarda y avisa al terminar", async () => {
    const guardar = jest.fn().mockResolvedValue({ id: 3 });
    const alGuardar = jest.fn();
    await render(<FormStock conNombre tituloBoton="Agregar" guardar={guardar} alGuardar={alGuardar} />);

    await fireEvent.changeText(screen.getByLabelText("Nombre del elemento"), "Silla Tiffany");
    await fireEvent.changeText(screen.getByLabelText("Cantidad disponible"), "40");
    await fireEvent.changeText(screen.getByLabelText("Valor por unidad (pesos)"), "8500,50");
    await fireEvent.press(screen.getByRole("button", { name: "Agregar" }));

    await waitFor(() => expect(alGuardar).toHaveBeenCalled());
    expect(guardar).toHaveBeenCalledWith({ nombreElemento: "Silla Tiffany", cantidad: 40, valor: "8500.50" });
  });

  it("al editar muestra el nombre fijo y los errores del API bajo su campo", async () => {
    const guardar = jest.fn().mockRejectedValue(new ErrorApi(400, { cantidad: ["Asegúrese de que este valor es mayor o igual a 0."] }));
    await render(
      <FormStock
        inicial={{ cantidad: 5, valor: "45000.00" }}
        nombreFijo="Mantel blanco"
        tituloBoton="Guardar cambios"
        guardar={guardar}
        alGuardar={jest.fn()}
      />,
    );

    expect(screen.getByText("Mantel blanco")).toBeTruthy();
    expect(screen.getByDisplayValue("45000")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Asegúrese de que este valor es mayor o igual a 0.")).toBeTruthy();
  });
});
