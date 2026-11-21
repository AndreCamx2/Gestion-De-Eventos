// El puente entre los módulos de la web y el cliente del celular.
import { api } from "../../api/cliente";
import { apiFetch } from "../api/client";

jest.mock("../../api/cliente", () => ({ API_URL: "https://api.prueba/api", api: jest.fn(async () => ({ ok: true })) }));

describe("apiFetch del celular", () => {
  it("traduce skipAuth a publica y deja pasar lo demás", async () => {
    await apiFetch("/token/", { method: "POST", body: "{}", skipAuth: true });
    expect(api).toHaveBeenLastCalledWith("/token/", { publica: true, method: "POST", body: "{}" });
  });

  it("sin skipAuth la petición va con sesión", async () => {
    await expect(apiFetch("/salones/", { method: "GET" })).resolves.toEqual({ ok: true });
    expect(api).toHaveBeenLastCalledWith("/salones/", { publica: false, method: "GET" });
  });
});
