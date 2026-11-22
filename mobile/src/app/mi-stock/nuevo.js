import { router } from "expo-router";
import { crearElemento } from "../../api/miStock";
import FormStock from "../../componentes/FormStock";
import { Cabecera } from "../../componentes/ui";
import RequiereRol from "../../sesion/RequiereRol";

export default function NuevoElemento() {
  return (
    <RequiereRol rol="proveedor">
      <FormStock cabecera={<Cabecera antetitulo="Mi stock" titulo="Nuevo elemento" />} conNombre tituloBoton="Agregar" guardar={crearElemento} alGuardar={() => router.back()} />
    </RequiereRol>
  );
}
