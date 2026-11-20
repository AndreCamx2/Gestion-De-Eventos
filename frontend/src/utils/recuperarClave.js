// Oculto hasta tener correo en el backend: sin él, "te llegará un enlace" sería mentira.
// Se enciende con VITE_RECUPERAR_CLAVE=true; se lee en cada llamada por las pruebas.
export function recuperarClaveActiva() {
  return import.meta.env.VITE_RECUPERAR_CLAVE === "true";
}
