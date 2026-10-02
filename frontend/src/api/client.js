const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error(
    "[SGDE] La variable VITE_API_URL no está definida. " +
    "Crea un archivo .env.local con: VITE_API_URL=http://localhost:8000/api"
  );
}

export async function apiFetch(endpoint, options = {}) {
  const skipAuth = options.skipAuth ?? false;
  // REGLA M-06: Usar sessionStorage en lugar de localStorage para prevenir persistencia insegura
  const token = !skipAuth ? sessionStorage.getItem("access_token") : null;

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

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