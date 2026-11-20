export function sitiosDeSalones(salones) {
  const porId = new Map();
  salones.forEach((s) => {
    if (!porId.has(s.sitio)) porId.set(s.sitio, { id: s.sitio, nombre: s.sitio_nombre });
  });
  return [...porId.values()].sort((a, b) => a.id - b.id);
}
