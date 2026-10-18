import { router } from "expo-router";
import { crearElemento } from "../../api/miStock";
import FormStock from "../../componentes/FormStock";
import RequiereRol from "../../sesion/RequiereRol";

export default function NuevoElemento() {
  return (
    <RequiereRol rol="proveedor">
      <FormStock conNombre tituloBoton="Agregar" guardar={crearElemento} alGuardar={() => router.back()} />
    </RequiereRol>
  );
}
