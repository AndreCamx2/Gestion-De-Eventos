const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export async function apiFetch(endpoint, options = {}) {
  const skipAuth = options.skipAuth ?? false;
  const token = !skipAuth ? localStorage.getItem("access_token") : null;

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || JSON.stringify(error) || "Error en la petición");
  }

  return response.json();
}