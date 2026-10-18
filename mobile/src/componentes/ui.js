import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { TOQUE_MINIMO, colores, espacio } from "../tema";
import { ESTADOS } from "../utils/estados";

// Piezas visuales compartidas por todas las pantallas.

export function Boton({ titulo, onPress, variante = "principal", deshabilitado = false, cargando = false }) {
  const estilo = variante === "secundario" ? estilos.botonSecundario : variante === "peligro" ? estilos.botonPeligro : estilos.botonPrincipal;
  const textoEstilo = variante === "principal" ? estilos.botonTextoClaro : variante === "peligro" ? estilos.botonTextoPeligro : estilos.botonTexto;
  const inactivo = deshabilitado || cargando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      onPress={onPress}
      disabled={inactivo}
      style={({ pressed }) => [estilos.boton, estilo, inactivo && estilos.botonInactivo, pressed && estilos.botonPresionado]}
    >
      {cargando ? (
        <ActivityIndicator color={variante === "principal" ? "#FFFFFF" : colores.tinta} />
      ) : (
        <Text style={[estilos.botonTextoBase, textoEstilo]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

export function Campo({ etiqueta, error, ...props }) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        accessibilityLabel={etiqueta}
        placeholderTextColor={colores.textoTenue}
        style={[estilos.input, error && estilos.inputError]}
        {...props}
      />
      {error ? <Text style={estilos.errorCampo}>{error}</Text> : null}
    </View>
  );
}

export function Tarjeta({ children, onPress, accessibilityLabel }) {
  if (!onPress) return <View style={estilos.tarjeta}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [estilos.tarjeta, pressed && estilos.tarjetaPresionada]}
    >
      {children}
    </Pressable>
  );
}

export function EtiquetaEstado({ estado }) {
  const e = ESTADOS[estado] || ESTADOS.cotizado;
  return (
    <View style={[estilos.etiquetaEstado, { backgroundColor: e.fondo }]}>
      <View style={[estilos.punto, { backgroundColor: e.punto }]} />
      <Text style={[estilos.etiquetaEstadoTexto, { color: e.texto }]}>{e.etiqueta}</Text>
    </View>
  );
}

export function Aviso({ texto, tipo = "error" }) {
  if (!texto) return null;
  return (
    <View accessibilityRole="alert" style={[estilos.aviso, tipo === "exito" && estilos.avisoExito]}>
      <Text style={[estilos.avisoTexto, tipo === "exito" && estilos.avisoTextoExito]}>{texto}</Text>
    </View>
  );
}

export function Cargando({ texto = "Cargando…" }) {
  return (
    <View style={estilos.centro}>
      <ActivityIndicator size="large" color={colores.tinta} />
      <Text style={estilos.textoSuave}>{texto}</Text>
    </View>
  );
}

export function Vacio({ titulo, texto }) {
  return (
    <View style={estilos.vacio}>
      <Text style={estilos.vacioTitulo}>{titulo}</Text>
      {texto ? <Text style={estilos.textoSuave}>{texto}</Text> : null}
    </View>
  );
}

export const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.l, gap: espacio.m },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: espacio.m, padding: espacio.xl },
  titulo: { fontSize: 24, fontWeight: "800", color: colores.texto, letterSpacing: -0.4 },
  subtitulo: { fontSize: 15, color: colores.textoSuave },
  antetitulo: { fontSize: 12, fontWeight: "800", color: colores.mandarinaTexto, letterSpacing: 1.4, textTransform: "uppercase" },
  textoSuave: { fontSize: 14, color: colores.textoSuave },
  textoFuerte: { fontSize: 16, fontWeight: "700", color: colores.texto },

  boton: { minHeight: TOQUE_MINIMO + 4, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: espacio.l },
  botonPrincipal: { backgroundColor: colores.tinta },
  botonSecundario: { backgroundColor: colores.superficie, borderWidth: 1, borderColor: colores.lineaFuerte },
  botonPeligro: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#F3C9B5" },
  botonInactivo: { opacity: 0.5 },
  botonPresionado: { transform: [{ scale: 0.97 }] },
  botonTextoBase: { fontSize: 16, fontWeight: "700" },
  botonTextoClaro: { color: "#FFFFFF" },
  botonTexto: { color: colores.texto },
  botonTextoPeligro: { color: colores.mandarinaTexto },

  campo: { gap: espacio.xs },
  etiqueta: { fontSize: 13, fontWeight: "600", color: colores.textoSuave },
  input: {
    minHeight: TOQUE_MINIMO + 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colores.lineaFuerte,
    backgroundColor: colores.campo,
    paddingHorizontal: espacio.m,
    fontSize: 16,
    color: colores.texto,
  },
  inputError: { borderColor: colores.peligro },
  errorCampo: { fontSize: 13, color: colores.peligro },

  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colores.linea,
    padding: espacio.l,
    gap: espacio.s,
  },
  tarjetaPresionada: { backgroundColor: colores.superficie2 },

  etiquetaEstado: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  punto: { width: 6, height: 6, borderRadius: 3 },
  etiquetaEstadoTexto: { fontSize: 12, fontWeight: "700" },

  aviso: { backgroundColor: "#FDECEA", borderRadius: 12, padding: espacio.m, borderWidth: 1, borderColor: "#F5C2BD" },
  avisoExito: { backgroundColor: "rgba(52,168,106,0.12)", borderColor: "rgba(52,168,106,0.35)" },
  avisoTexto: { color: colores.peligro, fontSize: 14 },
  avisoTextoExito: { color: colores.exito },

  vacio: { alignItems: "center", gap: espacio.s, paddingVertical: espacio.xl },
  vacioTitulo: { fontSize: 17, fontWeight: "700", color: colores.texto },
});
