import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "./Texto";
import { TOQUE_MINIMO, colores, espacio, radio, texto } from "../tema";
import { ESTADOS } from "../utils/estados";

// Piezas básicas con el mismo aspecto de la web (frontend/src/components/ui/*.css).

const VARIANTES = {
  principal: { fondo: colores.tinta, borde: "transparent", texto: colores.sobreOscuro },
  oscuro: { fondo: colores.texto, borde: "transparent", texto: colores.sobreOscuro },
  secundario: { fondo: colores.superficie, borde: colores.lineaFuerte, texto: colores.texto },
  peligro: { fondo: "transparent", borde: colores.peligroBorde, texto: colores.mandarinaTexto },
  exito: { fondo: colores.exitoFondo, borde: "transparent", texto: colores.exitoTexto },
};

export function Boton({ titulo, onPress, variante = "principal", deshabilitado = false, cargando = false, textoCargando, icono = null, alto }) {
  const v = VARIANTES[variante] ?? VARIANTES.principal;
  const inactivo = deshabilitado || cargando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      onPress={onPress}
      disabled={inactivo}
      style={({ pressed }) => [
        estilos.boton,
        { backgroundColor: v.fondo, borderColor: v.borde },
        alto ? { minHeight: alto } : null,
        inactivo && estilos.botonInactivo,
        pressed && estilos.botonPresionado,
      ]}
    >
      {cargando ? <ActivityIndicator color={v.texto} /> : icono}
      {cargando && textoCargando ? <Text style={[estilos.botonTextoBase, { color: v.texto }]}>{textoCargando}</Text> : null}
      {!cargando ? <Text style={[estilos.botonTextoBase, { color: v.texto }]}>{titulo}</Text> : null}
    </Pressable>
  );
}

// Campo con etiqueta arriba y error abajo (Campo.jsx).
//   obligatorio: asterisco mandarina, como en Login y Registro
//   clave: contraseña con botón "Ver / Ocultar" dentro del campo (acceso-clave)
//   extra: algo a la derecha de la etiqueta (por ejemplo, "¿La olvidaste?")
export function Campo({ etiqueta, error, obligatorio = false, clave = false, extra = null, style, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={estilos.campo}>
      {etiqueta || extra ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacio.m }}>
          {etiqueta ? (
            <Text style={estilos.etiqueta}>
              {etiqueta}
              {obligatorio ? <Text style={{ color: colores.mandarinaTexto }}> *</Text> : null}
            </Text>
          ) : null}
          {extra}
        </View>
      ) : null}
      <View>
        <TextInput
          accessibilityLabel={etiqueta}
          placeholderTextColor={colores.textoTenue}
          style={[estilos.input, error && estilos.inputError, clave && { paddingRight: 84 }, style]}
          secureTextEntry={clave ? !visible : props.secureTextEntry}
          autoCapitalize={clave ? "none" : props.autoCapitalize}
          autoCorrect={clave ? false : props.autoCorrect}
          {...props}
          {...(clave ? { secureTextEntry: !visible } : null)}
        />
        {clave ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? "Ocultar contraseña" : "Ver contraseña"}
            accessibilityState={{ selected: visible }}
            onPress={() => setVisible((v) => !v)}
            style={({ pressed }) => [estilos.verClave, pressed && { backgroundColor: colores.tintaSuave }]}
          >
            <Text style={estilos.verClaveTexto}>{visible ? "Ocultar" : "Ver"}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={estilos.errorCampo}>{error}</Text> : null}
    </View>
  );
}

export function Tarjeta({ children, onPress, accessibilityLabel, style }) {
  if (!onPress) return <View style={[estilos.tarjeta, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [estilos.tarjeta, style, pressed && estilos.tarjetaPresionada]}
    >
      {children}
    </Pressable>
  );
}

// Cabecera de cada pantalla (CabeceraPagina.jsx): antetítulo mandarina, título grande y subtítulo.
export function Cabecera({ antetitulo, titulo, subtitulo, acciones = null }) {
  return (
    <View style={{ gap: espacio.s }}>
      {antetitulo ? <Text style={estilos.antetitulo}>{antetitulo}</Text> : null}
      <Text style={estilos.titulo} accessibilityRole="header">
        {titulo}
      </Text>
      {subtitulo ? <Text style={[estilos.subtitulo, { marginTop: 2 }]}>{subtitulo}</Text> : null}
      {acciones ? <View style={{ gap: espacio.m, marginTop: espacio.s }}>{acciones}</View> : null}
    </View>
  );
}

// `etiqueta` cambia el texto (el cliente ve "Reservada temporalmente" en vez de "Bloqueado").
export function EtiquetaEstado({ estado, etiqueta }) {
  const e = ESTADOS[estado] || ESTADOS.cotizado;
  return (
    <View style={[estilos.etiquetaEstado, { backgroundColor: e.fondo }]}>
      <View style={[estilos.punto, { backgroundColor: e.punto }]} />
      <Text style={[estilos.etiquetaEstadoTexto, { color: e.texto }]}>{etiqueta ?? e.etiqueta}</Text>
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

export function Cargando({ texto: mensaje = "Cargando…" }) {
  return (
    <View style={estilos.centro}>
      <ActivityIndicator size="large" color={colores.tinta} />
      <Text style={estilos.textoSuave}>{mensaje}</Text>
    </View>
  );
}

// EstadoVacio.jsx
export function Vacio({ titulo, texto: mensaje, accion = null }) {
  return (
    <View style={estilos.vacio}>
      <Text style={estilos.vacioTitulo}>{titulo}</Text>
      {mensaje ? <Text style={[estilos.textoSuave, { textAlign: "center" }]}>{mensaje}</Text> : null}
      {accion}
    </View>
  );
}

export const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  // --espacio-6 arriba y --espacio-4 a los lados, como .panel__contenido en el teléfono
  contenido: { paddingHorizontal: espacio.l, paddingTop: espacio.xl, paddingBottom: espacio.e8, gap: espacio.l },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: espacio.m, padding: espacio.xl },
  titulo: { fontSize: texto.titulo, fontWeight: "800", color: colores.texto, letterSpacing: -1.1, lineHeight: 36 },
  subtitulo: { fontSize: texto.subtitulo, color: colores.textoSuave, lineHeight: 24 },
  antetitulo: { fontSize: texto.antetitulo, fontWeight: "800", color: colores.mandarinaTexto, letterSpacing: 1.56, textTransform: "uppercase" },
  textoSuave: { fontSize: texto.etiqueta + 1, color: colores.textoSuave, lineHeight: 21 },
  textoFuerte: { fontSize: texto.cuerpo, fontWeight: "700", color: colores.texto },

  boton: {
    minHeight: 48,
    borderRadius: radio.control,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espacio.s,
    paddingHorizontal: espacio.e5,
  },
  botonInactivo: { opacity: 0.5 },
  botonPresionado: { transform: [{ scale: 0.97 }] },
  botonTextoBase: { fontSize: texto.cuerpo, fontWeight: "800" },

  campo: { gap: 6 },
  etiqueta: { fontSize: texto.etiqueta, fontWeight: "600", color: colores.textoSuave },
  input: {
    minHeight: 46,
    borderRadius: radio.control,
    borderWidth: 1.5,
    borderColor: colores.lineaFuerte,
    backgroundColor: colores.campo,
    paddingHorizontal: espacio.m,
    fontSize: 16,
    color: colores.texto,
  },
  inputError: { borderColor: colores.peligro },
  errorCampo: { fontSize: texto.pequeno, fontWeight: "700", color: colores.peligro },
  verClave: {
    position: "absolute",
    right: 4,
    top: 1,
    minWidth: TOQUE_MINIMO,
    height: TOQUE_MINIMO,
    paddingHorizontal: espacio.m,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  verClaveTexto: { fontSize: 13, fontWeight: "700", color: colores.tinta },

  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.tarjetaGrande,
    borderWidth: 1,
    borderColor: colores.linea,
    padding: espacio.e5,
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
    borderRadius: radio.pildora,
  },
  punto: { width: 6, height: 6, borderRadius: 3 },
  etiquetaEstadoTexto: { fontSize: texto.pequeno, fontWeight: "700" },

  // .acceso-aviso de la web
  aviso: { backgroundColor: ESTADOS.vencida.fondo, borderRadius: radio.control, paddingVertical: 12, paddingHorizontal: 16 },
  avisoExito: { backgroundColor: ESTADOS.confirmado.fondo },
  avisoTexto: { color: colores.peligro, fontSize: 14, fontWeight: "600" },
  avisoTextoExito: { color: ESTADOS.confirmado.texto },

  vacio: { alignItems: "center", gap: espacio.s, paddingVertical: espacio.xl, paddingHorizontal: espacio.l },
  vacioTitulo: { fontSize: 16, fontWeight: "700", color: colores.texto, textAlign: "center" },
});
