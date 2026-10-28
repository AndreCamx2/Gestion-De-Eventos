// Sitios que tienen salones, armados con el sitio_nombre que trae cada salón de
// GET /api/salones/ (SGDE-104): así Rack y Calendario no piden /api/sitios/.
// Devuelve [{ id, nombre }] sin repetir, ordenados por id (el orden en que llegan
// de /api/sitios/). Los usan los chips de sitio de las dos pantallas.
export function sitiosDeSalones(salones) {
  const porId = new Map();
  salones.forEach((s) => {
    if (!porId.has(s.sitio)) porId.set(s.sitio, { id: s.sitio, nombre: s.sitio_nombre });
  });
  return [...porId.values()].sort((a, b) => a.id - b.id);
}
