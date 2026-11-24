import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Text } from "./Texto";
import { colores, espacio, radio, sombraFlotante, texto } from "../tema";
import logoVenue from "../../assets/marca/venue-logo.png";

// Piezas de Login, Registro y recuperar contraseña (acceso.css de la web, vista de teléfono).

export function PantallaAcceso({ children, fondo }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={[propios.acceso, fondo]} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="link" accessibilityLabel="Venue" onPress={() => router.replace("/login")} style={{ alignSelf: "flex-start", minHeight: 44, justifyContent: "center" }}>
            <Image source={logoVenue} style={{ height: 32, width: 157, resizeMode: "contain" }} accessibilityIgnoresInvertColors />
          </Pressable>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function TarjetaAcceso({ titulo, subtitulo, children }) {
  return (
    <View style={propios.tarjeta}>
      <View>
        <Text style={propios.tarjetaTitulo} accessibilityRole="header">
          {titulo}
        </Text>
        {subtitulo ? <Text style={propios.tarjetaSubtitulo}>{subtitulo}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function Pildora({ children }) {
  return (
    <View style={propios.pildora}>
      <View style={propios.pildoraPunto} />
      <Text style={propios.pildoraTexto}>{children}</Text>
    </View>
  );
}

// .acceso-enlace: negrita mandarina
export function EnlaceAcceso({ titulo, onPress, pequeno = false }) {
  return (
    <Text accessibilityRole="link" onPress={onPress} suppressHighlighting={false} style={[propios.enlace, pequeno && { fontSize: 13 }]}>
      {titulo}
    </Text>
  );
}

export function Divisor() {
  return <View style={{ height: 1, backgroundColor: colores.linea }} />;
}

// "¿Aún no tienes cuenta? Regístrate aquí"
export function PieAcceso({ texto: pregunta, enlace, onPress }) {
  return (
    <Text style={propios.pie}>
      {pregunta} <EnlaceAcceso titulo={enlace} onPress={onPress} />
    </Text>
  );
}

export function AvisoAcceso({ tipo = "error", children }) {
  if (!children) return null;
  const exito = tipo === "exito";
  return (
    <View accessibilityRole={exito ? "text" : "alert"} style={[propios.aviso, { backgroundColor: exito ? "rgba(52,168,106,0.14)" : "rgba(238,138,99,0.16)" }]}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: exito ? "#1F6E44" : colores.peligro }}>{children}</Text>
    </View>
  );
}

const propios = StyleSheet.create({
  acceso: { flexGrow: 1, paddingVertical: espacio.e5, paddingHorizontal: espacio.l, gap: espacio.e8 },
  tarjeta: {
    gap: 18,
    padding: espacio.xl,
    borderRadius: radio.tarjetaGrande,
    backgroundColor: colores.superficie,
    ...sombraFlotante,
  },
  tarjetaTitulo: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5, color: colores.texto },
  tarjetaSubtitulo: { marginTop: 6, fontSize: 14, color: colores.textoSuave },
  pildora: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radio.pildora,
    backgroundColor: colores.durazno,
  },
  pildoraPunto: { width: 6, height: 6, borderRadius: 3, backgroundColor: colores.mandarina },
  pildoraTexto: { fontSize: texto.etiqueta, fontWeight: "700", color: colores.mandarinaTexto },
  enlace: { fontWeight: "700", color: colores.mandarinaTexto },
  pie: { fontSize: 14, color: colores.textoSuave, textAlign: "center" },
  aviso: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: radio.control },
});
