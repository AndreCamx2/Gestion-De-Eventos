// Puente entre los módulos copiados de la web (frontend/src/api) y el cliente del
// celular (src/api/cliente.js). La web llama apiFetch(ruta, { skipAuth }); aquí se
// traduce a api(ruta, { publica }), que guarda los tokens en SecureStore y renueva
// el access igual que la web. Los errores traen `status` y `body`, como en la web.
import { API_URL, api } from "../../api/cliente";

export { API_URL };

export function apiFetch(endpoint, { skipAuth = false, ...opciones } = {}) {
  return api(endpoint, { publica: skipAuth, ...opciones });
}
