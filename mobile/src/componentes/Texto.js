import { createContext, useContext } from "react";
import { Text as TextoNativo, TextInput as CampoNativo, StyleSheet } from "react-native";

// Plus Jakarta Sans en toda la app, como la web (tokens.css: --fuente-base).
// En Android una fuente propia no cambia de grosor con fontWeight: cada grosor es
// un archivo. Por eso Text y TextInput de la app eligen el archivo según el
// fontWeight del estilo. Las pantallas importan Text y TextInput de aquí, no de
// react-native. Las fuentes se cargan en app/_layout.js.
export const FUENTES = {
  400: "PlusJakartaSans_400Regular",
  500: "PlusJakartaSans_500Medium",
  600: "PlusJakartaSans_600SemiBold",
  700: "PlusJakartaSans_700Bold",
  800: "PlusJakartaSans_800ExtraBold",
};

export function familiaDe(peso) {
  if (peso === "bold") return FUENTES[700];
  if (peso == null || peso === "normal") return FUENTES[400];
  return FUENTES[peso] ?? FUENTES[400];
}

// Un texto dentro de otro hereda el grosor del de afuera si no dice el suyo.
const FuentePadre = createContext(null);

export function Text({ style, children, ...props }) {
  const padre = useContext(FuentePadre);
  const plano = StyleSheet.flatten(style) ?? {};
  const familia = plano.fontFamily ?? (plano.fontWeight != null ? familiaDe(plano.fontWeight) : padre ?? FUENTES[400]);
  return (
    <TextoNativo {...props} style={[style, { fontFamily: familia, fontWeight: "normal" }]}>
      <FuentePadre.Provider value={familia}>{children}</FuentePadre.Provider>
    </TextoNativo>
  );
}

export function TextInput({ style, ...props }) {
  const plano = StyleSheet.flatten(style) ?? {};
  return <CampoNativo {...props} style={[style, { fontFamily: plano.fontFamily ?? familiaDe(plano.fontWeight), fontWeight: "normal" }]} />;
}
