import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { Boton, Cargando, estilos } from "../componentes/ui";
import { RUTA_POR_ROL, rolDe, useSesion } from "../sesion/Sesion";

// Punto de entrada: sin sesión → login; con sesión → el módulo de su rol.
export default function Inicio() {
  const { estado, usuario, salir } = useSesion();

  if (estado === "cargando") return <Cargando texto="Revisando tu sesión…" />;
  if (estado === "sin-sesion") return <Redirect href="/login" />;

  const ruta = RUTA_POR_ROL[rolDe(usuario)];
  if (ruta) return <Redirect href={ruta} />;

  // Rol cliente: en la beta no tiene módulo móvil.
  return (
    <SafeAreaView style={estilos.pantalla}>
      <View style={estilos.centro}>
        <Text style={estilos.titulo}>Hola{usuario?.first_name ? `, ${usuario.first_name}` : ""}</Text>
        <Text style={[estilos.subtitulo, { textAlign: "center" }]}>
          La app móvil es para administradores y proveedores. Consulta tus eventos desde la página web.
        </Text>
        <Boton titulo="Cerrar sesión" variante="secundario" onPress={salir} />
      </View>
    </SafeAreaView>
  );
}
