import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";
import { Text } from "../componentes/Texto";
import { Boton, Cargando, estilos } from "../componentes/ui";
import { RUTA_POR_ROL, rolDe, useSesion } from "../sesion/Sesion";

export default function Inicio() {
  const { estado, usuario, salir } = useSesion();

  if (estado === "cargando") return <Cargando texto="Revisando tu sesión…" />;
  if (estado === "sin-sesion") return <Redirect href="/login" />;

  const ruta = RUTA_POR_ROL[rolDe(usuario)];
  if (ruta) return <Redirect href={ruta} />;

  return (
    <SafeAreaView style={estilos.pantalla}>
      <View style={estilos.centro}>
        <Text style={estilos.titulo}>Hola{usuario?.first_name ? `, ${usuario.first_name}` : ""}</Text>
        <Text style={[estilos.subtitulo, { textAlign: "center" }]}>
          Tu usuario todavía no tiene un rol en el sistema. Pídele al administrador que te lo asigne.
        </Text>
        <Boton titulo="Cerrar sesión" variante="secundario" onPress={salir} />
      </View>
    </SafeAreaView>
  );
}
