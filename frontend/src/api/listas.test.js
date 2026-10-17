import { describe, expect, it } from "vitest";
import { simularApi } from "../test/apiFalsa";
import { MAX_PAGINAS, TAMANO_PAGINA, comoLista, todasLasPaginas } from "./listas";

// Respuesta paginada de DRF: `next` trae una URL (aquí con http://, como puede
// llegar detrás del proxy de Render) o null en la última página.
function pagina(results, hayMas) {
  return { count: 999, next: hayMas ? "http://interno/api/x/?page=n" : null, previous: null, results };
}

function paginaPedida(search) {
  return Number(new URLSearchParams(search).get("page") ?? 1);
}

describe("comoLista", () => {
  it("acepta una lista simple, una respuesta paginada o nada", () => {
    expect(comoLista([1, 2])).toEqual([1, 2]);
    expect(comoLista(pagina([3], true))).toEqual([3]);
    expect(comoLista(undefined)).toEqual([]);
  });
});

describe("todasLasPaginas (SGDE-116)", () => {
  it("con una lista simple la devuelve tal cual, en una sola petición", async () => {
    const llamadas = simularApi({ "GET /salones/": [200, [{ id: 1 }, { id: 2 }]] });

    expect(await todasLasPaginas("/salones/")).toEqual([{ id: 1 }, { id: 2 }]);
    expect(llamadas).toHaveLength(1);
  });

  it("une todas las páginas pidiendo ?page= con la ruta propia, no con la URL de next", async () => {
    const llamadas = simularApi({
      "GET /clientes/": ({ search }) => {
        const n = paginaPedida(search);
        return [200, pagina([{ id: n * 10 }, { id: n * 10 + 1 }], n < 3)];
      },
    });

    expect((await todasLasPaginas("/clientes/")).map((c) => c.id)).toEqual([10, 11, 20, 21, 30, 31]);
    expect(llamadas.map((l) => paginaPedida(l.search))).toEqual([1, 2, 3]);
    // Todas las páginas con el mismo tamaño: si no, la 2 no empezaría donde terminó la 1.
    for (const { search } of llamadas) {
      expect(new URLSearchParams(search).get("page_size")).toBe(String(TAMANO_PAGINA));
    }
  });

  it("conserva los filtros de la ruta en cada página", async () => {
    const llamadas = simularApi({
      "GET /clientes/": ({ search }) => [200, pagina([{ id: paginaPedida(search) }], paginaPedida(search) < 2)],
    });

    await todasLasPaginas("/clientes/?search=caribe&incluir_inactivos=true");
    for (const { search } of llamadas) {
      const params = new URLSearchParams(search);
      expect(params.get("search")).toBe("caribe");
      expect(params.get("incluir_inactivos")).toBe("true");
    }
  });

  it("si el API siempre trae next, se detiene en el tope de páginas", async () => {
    const llamadas = simularApi({ "GET /stock/": [200, pagina([{ id: 1 }], true)] });

    expect(await todasLasPaginas("/stock/")).toHaveLength(MAX_PAGINAS);
    expect(llamadas).toHaveLength(MAX_PAGINAS);
  });

  it("si falla una página, el error llega a la pantalla", async () => {
    simularApi({
      "GET /usuarios/": ({ search }) =>
        paginaPedida(search) === 1 ? [200, pagina([{ id: 1 }], true)] : [500, { detail: "Error" }],
    });

    await expect(todasLasPaginas("/usuarios/")).rejects.toBeTruthy();
  });
});
