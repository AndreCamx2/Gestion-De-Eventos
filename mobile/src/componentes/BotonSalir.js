import { Pressable, Text } from "react-native";
import { router } from "expo-router";
import { colores } from "../tema";
import { useSesion } from "../sesion/Sesion";

// "Salir" en la barra superior: cierra la sesión (SGDE-92) y vuelve al login.
export default function BotonSalir() {
  const { salir } = useSesion();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Cerrar sesión"
      hitSlop={12}
      onPress={async () => {
        await salir();
        router.replace("/login");
      }}
    >
      <Text style={{ color: colores.mandarinaTexto, fontWeight: "700", fontSize: 15 }}>Salir</Text>
    </Pressable>
  );
}
