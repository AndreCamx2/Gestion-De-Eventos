export const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error(
    "[SGDE] La variable VITE_API_URL no está definida. " +
    "Crea un archivo .env.local con: VITE_API_URL=http://localhost:8000/api"
  );
}

// Endpoints de login y renovación: un 401 aquí es definitivo, no se renueva.
const RUTAS_SIN_RENOVAR = ["/token/", "/token/refresh/"];

// Si varias peticiones reciben 401 a la vez, todas esperan esta promesa: el refresh
// rota y solo sirve una vez, así que dos renovaciones a la vez harían fallar la segunda.
let renovacionEnCurso = null;

function renovarAcceso() {
  if (!renovacionEnCurso) {
    renovacionEnCurso = (async () => {
      const refresh = sessionStorage.getItem("refresh_token");
      if (!refresh) return null;
      const response = await fetch(`${API_URL}/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (!data.access) return null;
      sessionStorage.setItem("access_token", data.access);
      // El backend rota el refresh: si no se guarda el nuevo, la próxima renovación da 401.
      if (data.refresh) sessionStorage.setItem("refresh_token", data.refresh);
      return data.access;
    })()
      .catch(() => null)
      .finally(() => {
        renovacionEnCurso = null;
      });
  }
  return renovacionEnCurso;
}

// Si mientras tanto otra petición ya lo renovó, se usa ese sin renovar de nuevo.
function accesoRenovado(tokenUsado) {
  const actual = sessionStorage.getItem("access_token");
  if (actual && actual !== tokenUsado) return Promise.resolve(actual);
  return renovarAcceso();
}

function enviar(endpoint, options, token) {
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  return fetch(`${API_URL}${endpoint}`, { ...options, headers });
}

export async function apiFetch(endpoint, options = {}) {
  const skipAuth = options.skipAuth ?? false;
  const token = !skipAuth ? sessionStorage.getItem("access_token") : null;

  let response = await enviar(endpoint, options, token);

  const ruta = endpoint.split("?")[0];
  const puedeRenovar =
    response.status === 401 &&
    !skipAuth &&
    !RUTAS_SIN_RENOVAR.includes(ruta) &&
    sessionStorage.getItem("refresh_token");
  if (puedeRenovar) {
    const nuevoToken = await accesoRenovado(token);
    if (nuevoToken) {
      response = await enviar(endpoint, options, nuevoToken);
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.detail || "Error en la petición");
    error.status = response.status;
    error.body = body;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
