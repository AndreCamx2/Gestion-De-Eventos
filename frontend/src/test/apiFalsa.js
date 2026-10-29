import { vi } from "vitest";

function respuesta(status, cuerpo) {
  return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function simularApi(rutas) {
  const llamadas = [];
  const fetchFalso = vi.fn(async (url, opciones = {}) => {
    const { pathname, search } = new URL(url);
    const ruta = pathname.replace(/^\/api/, "");
    const metodo = (opciones.method ?? "GET").toUpperCase();
    const cuerpo = opciones.body ? JSON.parse(opciones.body) : undefined;
    llamadas.push({ metodo, ruta, search, cuerpo });
    const manejador = rutas[`${metodo} ${ruta}`];
    if (!manejador) return respuesta(404, { detail: `Sin respuesta simulada para ${metodo} ${ruta}` });
    const [status, datos] = typeof manejador === "function" ? manejador({ cuerpo, search }) : manejador;
    return respuesta(status, datos);
  });
  vi.stubGlobal("fetch", fetchFalso);
  return llamadas;
}
