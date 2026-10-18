import { useCallback, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { listarSalones } from "../../api/disponibilidad";
import { Aviso, Cargando, Tarjeta, Vacio, estilos } from "../../componentes/ui";
import RequiereRol from "../../sesion/RequiereRol";
import { useSesion } from "../../sesion/Sesion";
import { mensajeDeError } from "../../utils/errores";

function Salones() {
  const { usuario } = useSesion();
  const [salones, setSalones] = useState(null);
  const [error, setError] = useState(null);
  const [recargando, setRecargando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const lista = await listarSalones();
      setSalones([...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e).general);
    }
  }, []);

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

  if (salones === null && !error) return <Cargando texto="Cargando salones…" />;

  return (
    <FlatList
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      data={salones ?? []}
      keyExtractor={(s) => String(s.id)}
      refreshing={recargando}
      onRefresh={recargar}
      ListHeaderComponent={
        <View style={{ gap: 6, marginBottom: 4 }}>
          <Text style={estilos.antetitulo}>Hola{usuario?.first_name ? `, ${usuario.first_name}` : ""}</Text>
          <Text style={estilos.subtitulo}>Elige un salón para ver sus próximos días y bloquear o liberar fechas.</Text>
          <Aviso texto={error} />
        </View>
      }
      ListEmptyComponent={
        error ? null : <Vacio titulo="No hay salones" texto="Tus sitios todavía no tienen salones activos." />
      }
      renderItem={({ item }) => (
        <Tarjeta
          accessibilityLabel={`${item.nombre}, ${item.sitio_nombre}`}
          onPress={() => router.push({ pathname: "/disponibilidad/[salon]", params: { salon: item.id, nombre: item.nombre } })}
        >
          <Text style={estilos.textoFuerte}>{item.nombre}</Text>
          <Text style={estilos.textoSuave}>{item.sitio_nombre}</Text>
        </Tarjeta>
      )}
    />
  );
}

export default function PantallaSalones() {
  return (
    <RequiereRol rol="administrador">
      <Salones />
    </RequiereRol>
  );
}
