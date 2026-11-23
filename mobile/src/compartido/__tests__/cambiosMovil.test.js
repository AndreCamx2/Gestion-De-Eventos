// Lo que cambia frente a la web en src/compartido (ver mobile/README.md):
// expresiones sin \p{...} y URLSearchParams sin set().
import { errorMotivo } from "../pages/cotizaciones/cancelacion";
import { iniciales } from "../pages/proveedores/proveedores";
import { validarSalon } from "../pages/salones/salones";

describe("cambios de la versión móvil", () => {
  it("la foto del salón acepta enlaces http(s) y rechaza el resto", () => {
    const base = { nombre: "Salón Caribe", ancho: "", altura: "" };
    expect(validarSalon({ ...base, foto_url: "https://fotos.ejemplo.com/salon.jpg" }).foto_url).toBeUndefined();
    expect(validarSalon({ ...base, foto_url: "http://ejemplo.co" }).foto_url).toBeUndefined();
    expect(validarSalon({ ...base, foto_url: "ftp://ejemplo.com/x" }).foto_url).toBeDefined();
    expect(validarSalon({ ...base, foto_url: "salon.jpg" }).foto_url).toBeDefined();
  });

  it("un motivo debe tener letras, también con tildes y ñ", () => {
    expect(errorMotivo("12345", "de la anulación")).toMatch(/palabras/);
    expect(errorMotivo("Año nuevo", "de la anulación")).toBeNull();
    expect(errorMotivo("Ética", "de la anulación")).toBeNull();
  });

  it("iniciales de proveedores con tildes", () => {
    expect(iniciales("Álvaro de la Peña")).toBe("ÁP");
    expect(iniciales("123 Eventos")).toBe("1E");
  });
});
