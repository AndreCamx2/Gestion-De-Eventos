// Recuperar contraseña por correo (SGDE-96). Necesita una cuenta de correo
// configurada en el backend (EMAIL_BACKEND y compañía en Render). Mientras no
// exista, el enlace del login y las dos pantallas quedan ocultos: sin correo,
// el usuario leería "te llegará un enlace" y no le llegaría nada.
// Se enciende con VITE_RECUPERAR_CLAVE=true (en .env.local, o en Vercel con un
// redeploy). Se lee en cada llamada para que las pruebas puedan cambiarla.
export function recuperarClaveActiva() {
  return import.meta.env.VITE_RECUPERAR_CLAVE === "true";
}
