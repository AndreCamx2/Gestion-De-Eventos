import { useCallback, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { listarMiStock } from "../../api/miStock";
import { Aviso, Boton, Cargando, Tarjeta, Vacio, estilos } from "../../componentes/ui";
import RequiereRol from "../../sesion/RequiereRol";
import { useSesion } from "../../sesion/Sesion";
import { mensajeDeError } from "../../utils/errores";
import { momentoLegible } from "../../utils/fechas";
import { pesos } from "../../utils/formato";

function MiStock() {
  const { usuario } = useSesion();
  const [elementos, setElementos] = useState(null);
  const [error, setError] = useState(null);
  const [recargando, setRecargando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const lista = await listarMiStock();
      setElementos([...lista].sort((a, b) => a.nombre_elemento.localeCompare(b.nombre_elemento, "es")));
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e).general);
      setElementos([]);
    }
  }, []);

  // Al volver de crear o editar un elemento, la lista se recarga.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  async function recargar() {
    setRecargando(true);
    await cargar();
    setRecargando(false);
  }

  if (elementos === null) return <Cargando texto="Cargando tu stock…" />;

  return (
    <FlatList
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      data={elementos}
      keyExtractor={(e) => String(e.id)}
      refreshing={recargando}
      onRefresh={recargar}
      ListHeaderComponent={
        <View style={{ gap: 8 }}>
          {usuario?.proveedor ? <Text style={estilos.antetitulo}>{usuario.proveedor.nombre}</Text> : null}
          <Text style={estilos.subtitulo}>Toca un elemento para actualizar su cantidad o su valor.</Text>
          <Aviso texto={error} />
          {!error ? <Boton titulo="Agregar elemento" onPress={() => router.push("/mi-stock/nuevo")} /> : null}
        </View>
      }
      ListEmptyComponent={
        error ? null : <Vacio titulo="Todavía no tienes elementos" texto="Agrega el primero con el botón de arriba." />
      }
      renderItem={({ item }) => (
        <Tarjeta
          accessibilityLabel={`${item.nombre_elemento}: ${item.cantidad} unidades`}
          onPress={() => router.push({ pathname: "/mi-stock/[id]", params: { id: item.id } })}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Text style={[estilos.textoFuerte, { flex: 1 }]}>{item.nombre_elemento}</Text>
            <Text style={estilos.textoFuerte}>{pesos(item.valor)}</Text>
          </View>
          <Text style={estilos.textoSuave}>
            {item.cantidad === 0 ? "Agotado" : `${item.cantidad} ${item.cantidad === 1 ? "unidad" : "unidades"}`}
            {item.actualizado_en ? ` · actualizado ${momentoLegible(item.actualizado_en)}` : ""}
          </Text>
        </Tarjeta>
      )}
    />
  );
}

export default function PantallaMiStock() {
  return (
    <RequiereRol rol="proveedor">
      <MiStock />
    </RequiereRol>
  );
}
