import { Campo } from "./ui";

// Versión web (Expo para navegador): el calendario nativo no funciona en la web, así
// que la fecha se escribe como AAAA-MM-DD. En Android e iOS se usa CampoFecha.native.js.
// Mismas props en las dos: etiqueta, value, onChangeText, error, placeholder, minimo,
// maximo, opcional.
// eslint-disable-next-line no-unused-vars
export function CampoFecha({ etiqueta, value, onChangeText, error, minimo, maximo, opcional, ...props }) {
  return (
    <Campo
      etiqueta={etiqueta}
      value={value ?? ""}
      onChangeText={(t) => onChangeText(t.replace(/[^\d-]/g, "").slice(0, 10))}
      placeholder="AAAA-MM-DD"
      autoCorrect={false}
      maxLength={10}
      error={error}
      {...props}
    />
  );
}
