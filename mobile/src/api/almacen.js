import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// En el celular, SecureStore. En web (solo para probar) no existe: sessionStorage.
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
