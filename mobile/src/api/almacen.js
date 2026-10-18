import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Dónde se guardan los tokens JWT.
// - Celular (Android/iOS): expo-secure-store, cifrado por el sistema. La sesión
//   sobrevive a cerrar la app hasta que vence el refresh (12 h, SGDE-86).
// - Navegador (npx expo start --web, solo para probar): SecureStore no existe en
//   web, así que se usa sessionStorage, igual que el frontend web.
const enWeb = Platform.OS === "web";

export const CLAVES = { access: "sgde_access", refresh: "sgde_refresh" };

export async function leer(clave) {
  if (enWeb) return globalThis.sessionStorage?.getItem(clave) ?? null;
  return SecureStore.getItemAsync(clave);
}

export async function guardar(clave, valor) {
  if (enWeb) {
    globalThis.sessionStorage?.setItem(clave, valor);
    return;
  }
  await SecureStore.setItemAsync(clave, valor);
}

export async function borrar(clave) {
  if (enWeb) {
    globalThis.sessionStorage?.removeItem(clave);
    return;
  }
  await SecureStore.deleteItemAsync(clave);
}

export async function borrarTokens() {
  await Promise.all([borrar(CLAVES.access), borrar(CLAVES.refresh)]);
}
