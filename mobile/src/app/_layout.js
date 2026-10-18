import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import BotonSalir from "../componentes/BotonSalir";
import { ProveedorSesion } from "../sesion/Sesion";
import { colores } from "../tema";

// Navegación de la app (Expo Router): cada archivo de src/app/ es una pantalla.
export default function Layout() {
  return (
    <ProveedorSesion>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colores.superficie },
          headerTintColor: colores.texto,
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colores.fondo },
          headerRight: () => <BotonSalir />,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="disponibilidad/index" options={{ title: "Disponibilidad" }} />
        <Stack.Screen name="disponibilidad/[salon]" options={{ title: "Salón" }} />
        <Stack.Screen name="cotizacion/[id]" options={{ title: "Cotización" }} />
        <Stack.Screen name="mi-stock/index" options={{ title: "Mi stock" }} />
        <Stack.Screen name="mi-stock/nuevo" options={{ title: "Nuevo elemento" }} />
        <Stack.Screen name="mi-stock/[id]" options={{ title: "Editar elemento" }} />
      </Stack>
    </ProveedorSesion>
  );
}
