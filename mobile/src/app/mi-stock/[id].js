import { useEffect, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { historialMiStock } from "../../api/extras";
import { actualizarElemento, obtenerElemento } from "../../api/miStock";
import FormStock from "../../componentes/FormStock";
import HistorialStock from "../../componentes/HistorialStock";
import { Aviso, Boton, Cargando, estilos } from "../../componentes/ui";
import RequiereRol from "../../sesion/RequiereRol";
import { mensajeDeError } from "../../utils/errores";

function EditarElemento() {
  const { id } = useLocalSearchParams();
  const [elemento, setElemento] = useState(null);
  const [error, setError] = useState(null);
  const [historial, setHistorial] = useState(null);

  useEffect(() => {
    let vigente = true;
    // El historial es un extra: si falla, el formulario se muestra igual.
    historialMiStock(id)
      .then((h) => vigente && setHistorial(h))
      .catch(() => {});
    obtenerElemento(id)
      .then((e) => vigente && setElemento(e))
      .catch((e) => vigente && setError(mensajeDeError(e).general));
    return () => {
      vigente = false;
    };
  }, [id]);

  if (error) {
    return (
      <View style={[estilos.pantalla, estilos.contenido]}>
        <Aviso texto={error} />
        <Boton titulo="Volver" variante="secundario" onPress={() => router.back()} />
      </View>
    );
  }
  if (!elemento) return <Cargando />;

  return (
    <FormStock
      inicial={{ cantidad: elemento.cantidad, valor: elemento.valor }}
      nombreFijo={elemento.nombre_elemento}
      tituloBoton="Guardar cambios"
      guardar={(datos) => actualizarElemento(elemento.id, datos)}
      alGuardar={() => router.back()}
      pie={<HistorialStock historial={historial} />}
    />
  );
}

export default function PantallaEditarElemento() {
  return (
    <RequiereRol rol="proveedor">
      <EditarElemento />
    </RequiereRol>
  );
}
