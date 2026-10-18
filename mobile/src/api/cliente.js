import { CLAVES, borrarTokens, guardar, leer } from "./almacen";

// URL del API: EXPO_PUBLIC_API_URL (mobile/.env.local) o, si no está, producción.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || "https://sgde-backend.onrender.com/api").replace(/\/+$/, "");

// Error del API con el código HTTP y el cuerpo, para que cada pantalla decida
// qué mostrar (400 con errores por campo, 403 con `codigo`, 409 con `detail`...).
export class ErrorApi extends Error {
  constructor(status, cuerpo) {
    super(cuerpo?.detail || `Error ${status}`);
    this.status = status;
    this.cuerpo = cuerpo;
  }
}

// Sin conexión, o el servidor dormido de Render que tardó demasiado.
export class ErrorRed extends Error {}

// Avisa a la app que la sesión venció y no se pudo renovar (vuelve al login).
let alVencerSesion = () => {};
export function alVencer(funcion) {
  alVencerSesion = funcion;
}

async function leerCuerpo(respuesta) {
  const texto = await respuesta.text();
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return { detail: texto };
  }
}

async function enviar(ruta, opciones, token) {
  const cabeceras = { "Content-Type": "application/json", ...(opciones.headers || {}) };
  if (token) cabeceras.Authorization = `Bearer ${token}`;
  try {
    return await fetch(`${API_URL}${ruta}`, { ...opciones, headers: cabeceras });
  } catch {
    throw new ErrorRed("No pudimos conectarnos con el servidor.");
  }
}

// Renovación del access (SGDE-86). Si varias peticiones reciben 401 a la vez,
// todas esperan esta misma promesa: con la rotación de SGDE-92 el refresh sirve
// UNA sola vez, y dos renovaciones a la vez harían fallar la segunda.
let renovacion = null;
function renovarAcceso() {
  if (!renovacion) {
    renovacion = (async () => {
      const refresh = await leer(CLAVES.refresh);
      if (!refresh) return null;
      const respuesta = await enviar("/token/refresh/", { method: "POST", body: JSON.stringify({ refresh }) });
      if (!respuesta.ok) return null;
      const datos = await respuesta.json();
      await guardar(CLAVES.access, datos.access);
      // El backend rota el refresh: el usado ya no sirve, hay que guardar el nuevo.
      if (datos.refresh) await guardar(CLAVES.refresh, datos.refresh);
      return datos.access;
    })()
      .catch(() => null)
      .finally(() => {
        renovacion = null;
      });
  }
  return renovacion;
}

// Llamada al API con el token. Si responde 401, renueva una vez y repite.
// Con `publica: true` no manda token ni intenta renovar (login, por ejemplo).
export async function api(ruta, { publica = false, ...opciones } = {}) {
  const token = publica ? null : await leer(CLAVES.access);
  let respuesta = await enviar(ruta, opciones, token);

  if (respuesta.status === 401 && !publica) {
    const nuevo = await renovarAcceso();
    if (!nuevo) {
      await borrarTokens();
      alVencerSesion();
      throw new ErrorApi(401, { detail: "Tu sesión venció. Vuelve a entrar." });
    }
    respuesta = await enviar(ruta, opciones, nuevo);
  }

  const cuerpo = await leerCuerpo(respuesta);
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, cuerpo);
  return cuerpo;
}
