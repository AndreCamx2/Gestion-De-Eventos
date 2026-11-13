import { CLAVES, borrarTokens, guardar, leer } from "./almacen";

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || "https://sgde-backend.onrender.com/api").replace(/\/+$/, "");

export class ErrorApi extends Error {
  constructor(status, cuerpo) {
    super(cuerpo?.detail || `Error ${status}`);
    this.status = status;
    this.cuerpo = cuerpo;
  }
}

// Sin conexión, o el servidor dormido de Render que tardó demasiado.
export class ErrorRed extends Error {}

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

// Si varias peticiones reciben 401 a la vez, todas esperan esta promesa: el refresh
// rota y solo sirve una vez.
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
