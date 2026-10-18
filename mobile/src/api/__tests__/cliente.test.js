// Cliente del API: renovación del token (SGDE-86/92) y paginación (SGDE-116).
// El almacén de tokens se reemplaza por un objeto en memoria (jest.mock se
// ejecuta antes que los imports, aunque esté escrito después).
import { ErrorApi, alVencer, api } from "../cliente";
import { todasLasPaginas } from "../listas";

const mockMemoria = {};
jest.mock("../almacen", () => ({
  CLAVES: { access: "sgde_access", refresh: "sgde_refresh" },
  leer: jest.fn(async (clave) => mockMemoria[clave] ?? null),
  guardar: jest.fn(async (clave, valor) => {
    mockMemoria[clave] = valor;
  }),
  borrarTokens: jest.fn(async () => {
    delete mockMemoria.sgde_access;
    delete mockMemoria.sgde_refresh;
  }),
}));

function respuesta(status, cuerpo) {
  return { ok: status >= 200 && status < 300, status, text: async () => (cuerpo === undefined ? "" : JSON.stringify(cuerpo)), json: async () => cuerpo };
}

beforeEach(() => {
  for (const clave of Object.keys(mockMemoria)) delete mockMemoria[clave];
  global.fetch = jest.fn();
});

describe("api() y la renovación del token", () => {
  it("manda el access y devuelve el cuerpo", async () => {
    mockMemoria.sgde_access = "acceso-1";
    fetch.mockResolvedValueOnce(respuesta(200, { ok: true }));

    await expect(api("/usuarios/me/")).resolves.toEqual({ ok: true });
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer acceso-1");
  });

  it("con 401 renueva una sola vez, guarda el refresh rotado y repite", async () => {
    mockMemoria.sgde_access = "viejo";
    mockMemoria.sgde_refresh = "refresh-1";
    fetch.mockImplementation(async (url, opciones) => {
      if (url.endsWith("/token/refresh/")) return respuesta(200, { access: "nuevo", refresh: "refresh-2" });
      return opciones.headers.Authorization === "Bearer nuevo" ? respuesta(200, { id: 1 }) : respuesta(401, {});
    });

    // Dos peticiones a la vez: una sola llamada a /token/refresh/.
    await Promise.all([api("/salones/"), api("/calendario/")]);
    expect(fetch.mock.calls.filter(([url]) => url.endsWith("/token/refresh/"))).toHaveLength(1);
    expect(mockMemoria.sgde_refresh).toBe("refresh-2");
  });

  it("si la renovación falla, borra los tokens y avisa que venció la sesión", async () => {
    mockMemoria.sgde_access = "viejo";
    mockMemoria.sgde_refresh = "vencido";
    const aviso = jest.fn();
    alVencer(aviso);
    fetch.mockResolvedValue(respuesta(401, { detail: "x" }));

    await expect(api("/salones/")).rejects.toBeInstanceOf(ErrorApi);
    expect(aviso).toHaveBeenCalled();
    expect(mockMemoria.sgde_refresh).toBeUndefined();
  });

  it("un 409 llega como ErrorApi con su detail", async () => {
    fetch.mockResolvedValueOnce(respuesta(409, { detail: "Fecha ocupada." }));
    await expect(api("/cotizaciones/1/bloqueo/", { method: "POST" })).rejects.toMatchObject({
      status: 409,
      message: "Fecha ocupada.",
    });
  });
});

describe("todasLasPaginas", () => {
  it("una lista simple se devuelve en una sola petición", async () => {
    fetch.mockResolvedValueOnce(respuesta(200, [{ id: 1 }]));
    await expect(todasLasPaginas("/salones/")).resolves.toEqual([{ id: 1 }]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("une las páginas con la ruta propia y conserva los filtros", async () => {
    fetch.mockImplementation(async (url) => {
      const pagina = Number(new URL(url).searchParams.get("page") ?? 1);
      return respuesta(200, { count: 2, next: pagina < 2 ? "http://otro/x?page=2" : null, results: [{ id: pagina }] });
    });

    await expect(todasLasPaginas("/mi-stock/?search=silla")).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    const urls = fetch.mock.calls.map(([url]) => new URL(url));
    expect(urls.every((u) => u.searchParams.get("search") === "silla" && u.searchParams.get("page_size") === "200")).toBe(true);
    expect(urls[1].host).not.toBe("otro");
  });
});
