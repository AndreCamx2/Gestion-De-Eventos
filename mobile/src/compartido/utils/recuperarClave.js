// Oculto hasta tener correo en el backend: sin él, "te llegará un enlace" sería mentira.
// En el celular se enciende con EXPO_PUBLIC_RECUPERAR_CLAVE=true (en la web, VITE_RECUPERAR_CLAVE).
export function recuperarClaveActiva() {
  return process.env.EXPO_PUBLIC_RECUPERAR_CLAVE === "true";
}
