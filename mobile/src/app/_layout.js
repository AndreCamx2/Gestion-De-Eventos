import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import BotonSalir from "../componentes/BotonSalir";
import { ProveedorSesion } from "../sesion/Sesion";
import { colores } from "../tema";

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
        <Stack.Screen name="registro" options={{ title: "Crear cuenta", headerRight: () => null }} />
        <Stack.Screen name="recuperar-clave" options={{ title: "Recuperar contraseña", headerRight: () => null }} />
        <Stack.Screen name="restablecer-clave" options={{ title: "Nueva contraseña", headerRight: () => null }} />
        <Stack.Screen name="inicio" options={{ title: "Inicio" }} />
        <Stack.Screen name="cotizaciones/index" options={{ title: "Cotizaciones" }} />
        <Stack.Screen name="cotizaciones/nueva" options={{ title: "Nueva cotización" }} />
        <Stack.Screen name="cotizacion/[id]" options={{ title: "Cotización" }} />
        <Stack.Screen name="calendario" options={{ title: "Calendario" }} />
        <Stack.Screen name="rack" options={{ title: "Rack de salones" }} />
        <Stack.Screen name="historico" options={{ title: "Histórico" }} />
        <Stack.Screen name="ingresos" options={{ title: "Ingresos" }} />
        <Stack.Screen name="disponibilidad/index" options={{ title: "Disponibilidad" }} />
        <Stack.Screen name="disponibilidad/[salon]" options={{ title: "Salón" }} />
        <Stack.Screen name="clientes/index" options={{ title: "Clientes" }} />
        <Stack.Screen name="clientes/[id]" options={{ title: "Cliente" }} />
        <Stack.Screen name="sitios" options={{ title: "Venues" }} />
        <Stack.Screen name="salones/index" options={{ title: "Salones" }} />
        <Stack.Screen name="salones/[id]" options={{ title: "Salón" }} />
        <Stack.Screen name="conceptos/index" options={{ title: "Conceptos" }} />
        <Stack.Screen name="conceptos/[id]" options={{ title: "Concepto" }} />
        <Stack.Screen name="proveedores/index" options={{ title: "Proveedores" }} />
        <Stack.Screen name="proveedores/comparar" options={{ title: "Comparar precios" }} />
        <Stack.Screen name="proveedores/[id]" options={{ title: "Proveedor" }} />
        <Stack.Screen name="usuarios" options={{ title: "Usuarios" }} />
        <Stack.Screen name="mis-cotizaciones/index" options={{ title: "Mis cotizaciones" }} />
        <Stack.Screen name="mis-cotizaciones/[id]" options={{ title: "Mi cotización" }} />
        <Stack.Screen name="mi-stock/index" options={{ title: "Mi stock" }} />
        <Stack.Screen name="mi-stock/nuevo" options={{ title: "Nuevo elemento" }} />
        <Stack.Screen name="mi-stock/[id]" options={{ title: "Editar elemento" }} />
        <Stack.Screen name="perfil" options={{ title: "Mi perfil" }} />
      </Stack>
    </ProveedorSesion>
  );
}
