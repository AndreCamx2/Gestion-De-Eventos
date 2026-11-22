import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import Marco from "../componentes/Marco";
import { Cargando } from "../componentes/ui";
import { ProveedorSesion } from "../sesion/Sesion";
import { colores } from "../tema";

// Sin encabezado de React Navigation: el marco (logo, avatar y barra de abajo) es el de la web.
export default function Layout() {
  const [fuentesListas, errorFuentes] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  // Si la fuente no carga (sin red la primera vez), la app sigue con la del sistema.
  if (!fuentesListas && !errorFuentes) return <Cargando texto="" />;

  return (
    <ProveedorSesion>
      <StatusBar style="dark" />
      <Marco>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.fondo } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="registro" />
          <Stack.Screen name="recuperar-clave" />
          <Stack.Screen name="restablecer-clave" />
          <Stack.Screen name="inicio" />
          <Stack.Screen name="cotizaciones/index" />
          <Stack.Screen name="cotizaciones/nueva" />
          <Stack.Screen name="cotizacion/[id]" />
          <Stack.Screen name="calendario" />
          <Stack.Screen name="rack" />
          <Stack.Screen name="historico" />
          <Stack.Screen name="ingresos" />
          <Stack.Screen name="disponibilidad/index" />
          <Stack.Screen name="disponibilidad/[salon]" />
          <Stack.Screen name="clientes/index" />
          <Stack.Screen name="clientes/[id]" />
          <Stack.Screen name="sitios" />
          <Stack.Screen name="salones/index" />
          <Stack.Screen name="salones/[id]" />
          <Stack.Screen name="conceptos/index" />
          <Stack.Screen name="conceptos/[id]" />
          <Stack.Screen name="proveedores/index" />
          <Stack.Screen name="proveedores/comparar" />
          <Stack.Screen name="proveedores/[id]" />
          <Stack.Screen name="usuarios" />
          <Stack.Screen name="mis-cotizaciones/index" />
          <Stack.Screen name="mis-cotizaciones/[id]" />
          <Stack.Screen name="mi-stock/index" />
          <Stack.Screen name="mi-stock/nuevo" />
          <Stack.Screen name="mi-stock/[id]" />
          <Stack.Screen name="perfil" />
        </Stack>
      </Marco>
    </ProveedorSesion>
  );
}
