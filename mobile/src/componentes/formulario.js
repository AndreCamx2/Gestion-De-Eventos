import { useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { TOQUE_MINIMO, colores, espacio } from "../tema";
import { Aviso, Boton, Campo, estilos } from "./ui";

// Piezas de formulario y de pantalla que usan los módulos nuevos (cotizaciones,
// catálogos, reportes). Solo React Native: sin librerías extra que instalar.

function sinTildes(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Lista desplegable: abre una ventana con las opciones (y un buscador si son muchas).
// opciones: [{ valor, etiqueta, detalle? }]
export function Selector({ etiqueta, valor, opciones, onCambiar, error, placeholder = "Elige una opción", deshabilitado = false, conVacio }) {
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState("");
  const todas = useMemo(() => (conVacio ? [{ valor: "", etiqueta: conVacio }, ...opciones] : opciones), [opciones, conVacio]);
  const elegida = todas.find((o) => String(o.valor) === String(valor ?? ""));
  const lista = useMemo(() => {
    const f = sinTildes(filtro.trim());
    return f ? todas.filter((o) => sinTildes(`${o.etiqueta} ${o.detalle ?? ""}`).includes(f)) : todas;
  }, [todas, filtro]);

  return (
    <View style={estilos.campo}>
      {etiqueta ? <Text style={estilos.etiqueta}>{etiqueta}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta ?? "Opción"}: ${elegida?.etiqueta ?? placeholder}`}
        disabled={deshabilitado}
        onPress={() => {
          setFiltro("");
          setAbierto(true);
        }}
        style={[estilos.input, propios.selector, error && estilos.inputError, deshabilitado && { opacity: 0.5 }]}
      >
        <Text style={{ flex: 1, fontSize: 16, color: elegida ? colores.texto : colores.textoTenue }} numberOfLines={1}>
          {elegida?.etiqueta ?? placeholder}
        </Text>
        <Text style={{ color: colores.textoSuave }}>▾</Text>
      </Pressable>
      {error ? <Text style={estilos.errorCampo}>{error}</Text> : null}

      <Modal visible={abierto} animationType="slide" transparent onRequestClose={() => setAbierto(false)}>
        <View style={propios.fondoModal}>
          <View style={[propios.hoja, { maxHeight: "80%" }]}>
            <Text style={estilos.textoFuerte}>{etiqueta ?? placeholder}</Text>
            {opciones.length > 8 ? (
              <TextInput
                value={filtro}
                onChangeText={setFiltro}
                placeholder="Buscar…"
                placeholderTextColor={colores.textoTenue}
                style={estilos.input}
                autoCorrect={false}
              />
            ) : null}
            <FlatList
              data={lista}
              keyExtractor={(o) => String(o.valor)}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={estilos.textoSuave}>Sin resultados.</Text>}
              renderItem={({ item }) => {
                const activa = String(item.valor) === String(valor);
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: activa }}
                    onPress={() => {
                      setAbierto(false);
                      onCambiar(item.valor);
                    }}
                    style={({ pressed }) => [propios.opcion, activa && propios.opcionActiva, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={[estilos.textoFuerte, { fontWeight: activa ? "800" : "600" }]}>{item.etiqueta}</Text>
                    {item.detalle ? <Text style={estilos.textoSuave}>{item.detalle}</Text> : null}
                  </Pressable>
                );
              }}
            />
            <Boton titulo="Cerrar" variante="secundario" onPress={() => setAbierto(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Fila de "chips" para filtros: [{ valor, etiqueta }]
export function Segmento({ opciones, valor, onCambiar }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: espacio.s }}>
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable
            key={String(o.valor)}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            onPress={() => onCambiar(o.valor)}
            style={[propios.chip, activo && propios.chipActivo]}
          >
            <Text style={[propios.chipTexto, activo && { color: "#FFFFFF" }]}>{o.etiqueta}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// Fecha como texto AAAA-MM-DD: es lo que espera el API y no exige instalar un calendario nativo.
export function CampoFecha({ etiqueta, value, onChangeText, error, ...props }) {
  return (
    <Campo
      etiqueta={etiqueta}
      value={value ?? ""}
      onChangeText={(t) => onChangeText(t.replace(/[^\d-]/g, "").slice(0, 10))}
      placeholder="AAAA-MM-DD"
      keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
      autoCorrect={false}
      maxLength={10}
      error={error}
      {...props}
    />
  );
}

export function AreaTexto(props) {
  return <Campo multiline textAlignVertical="top" style={[estilos.input, { minHeight: 96, paddingTop: 10 }]} {...props} />;
}

export function Interruptor({ etiqueta, valor, onCambiar, detalle }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m, minHeight: TOQUE_MINIMO }}>
      <View style={{ flex: 1 }}>
        <Text style={estilos.textoFuerte}>{etiqueta}</Text>
        {detalle ? <Text style={estilos.textoSuave}>{detalle}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={etiqueta}
        value={Boolean(valor)}
        onValueChange={onCambiar}
        trackColor={{ true: colores.tinta, false: colores.lineaFuerte }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

// Ventana sobre la pantalla (como los diálogos de la web).
export function Dialogo({ visible, titulo, onCerrar, children }) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCerrar}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={propios.fondoModal}>
          <View style={[propios.hoja, { maxHeight: "90%" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.s }}>
              <Text style={[estilos.textoFuerte, { flex: 1, fontSize: 18 }]} accessibilityRole="header">
                {titulo}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={12} onPress={onCerrar}>
                <Text style={{ fontSize: 22, color: colores.textoSuave }}>×</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: espacio.m, paddingBottom: espacio.s }} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Confirmación en ventana propia (Alert.alert no funciona en la versión web de Expo).
export function Confirmar({ visible, titulo, texto, textoAccion = "Sí, continuar", peligro = false, cargando = false, error, onAceptar, onCerrar }) {
  return (
    <Dialogo visible={visible} titulo={titulo} onCerrar={onCerrar}>
      {texto ? <Text style={estilos.subtitulo}>{texto}</Text> : null}
      <Aviso texto={error} />
      <Boton titulo={textoAccion} variante={peligro ? "peligro" : "principal"} cargando={cargando} onPress={onAceptar} />
      <Boton titulo="Cancelar" variante="secundario" onPress={onCerrar} deshabilitado={cargando} />
    </Dialogo>
  );
}

export function Dato({ etiqueta, valor, children }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      {children ?? <Text style={estilos.textoFuerte}>{valor ?? "—"}</Text>}
    </View>
  );
}

export function Fila({ izquierda, derecha, fuerte = false }) {
  const estilo = fuerte ? estilos.textoFuerte : estilos.textoSuave;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: espacio.s }}>
      <Text style={[estilo, { flex: 1 }]}>{izquierda}</Text>
      <Text style={estilo}>{derecha}</Text>
    </View>
  );
}

// Cifras en cuadrícula de dos columnas: [{ etiqueta, valor, detalle? }]
export function Cifras({ items }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.s }}>
      {items.map((c) => (
        <View key={c.etiqueta} style={propios.cifra}>
          <Text style={estilos.etiqueta}>{c.etiqueta}</Text>
          <Text style={{ fontSize: 22, fontWeight: "800", color: colores.texto }}>{c.valor}</Text>
          {c.detalle ? <Text style={[estilos.textoSuave, { fontSize: 12 }]}>{c.detalle}</Text> : null}
        </View>
      ))}
    </View>
  );
}

export function Seccion({ titulo, children, accion }) {
  return (
    <View style={{ gap: espacio.s }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacio.s }}>
        <Text style={[estilos.antetitulo, { color: colores.textoSuave }]} accessibilityRole="header">
          {titulo}
        </Text>
        {accion ?? null}
      </View>
      {children}
    </View>
  );
}

export function Enlace({ titulo, onPress }) {
  return (
    <Pressable accessibilityRole="link" hitSlop={8} onPress={onPress}>
      <Text style={{ color: colores.tinta, fontWeight: "700", fontSize: 15 }}>{titulo}</Text>
    </Pressable>
  );
}

// Pantalla de error con "Reintentar".
export function ErrorPantalla({ texto, onReintentar }) {
  return (
    <View style={[estilos.pantalla, estilos.contenido]}>
      <Aviso texto={texto} />
      {onReintentar ? <Boton titulo="Reintentar" variante="secundario" onPress={onReintentar} /> : null}
    </View>
  );
}

const propios = StyleSheet.create({
  selector: { flexDirection: "row", alignItems: "center", gap: espacio.s },
  fondoModal: { flex: 1, backgroundColor: "rgba(29,35,43,0.45)", justifyContent: "flex-end" },
  hoja: {
    backgroundColor: colores.superficie,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: espacio.l,
    paddingBottom: espacio.xl,
    gap: espacio.m,
  },
  opcion: { paddingVertical: espacio.m, paddingHorizontal: espacio.s, borderRadius: 10, gap: 2 },
  opcionActiva: { backgroundColor: colores.tintaSuave },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colores.lineaFuerte,
    backgroundColor: colores.superficie,
    justifyContent: "center",
  },
  chipActivo: { backgroundColor: colores.tinta, borderColor: colores.tinta },
  chipTexto: { fontSize: 14, fontWeight: "700", color: colores.texto },
  cifra: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colores.superficie,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colores.linea,
    padding: espacio.m,
    gap: 2,
  },
});
