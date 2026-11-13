export function contarPorSitio(sitios, { salones, conceptos, usuarios }) {
  const conteos = {};
  for (const sitio of sitios) {
    conteos[sitio.id] = {
      salones: salones ? 0 : null,
      conceptos: conceptos ? 0 : null,
      usuarios: usuarios ? 0 : null,
    };
  }

  const sumar = (idSitio, campo) => {
    if (conteos[idSitio]) conteos[idSitio][campo] += 1;
  };

  salones?.forEach((salon) => sumar(salon.sitio, "salones"));
  conceptos?.forEach((concepto) => {
    if (concepto.activo) sumar(concepto.sitio, "conceptos");
  });
  usuarios?.forEach((usuario) => {
    (usuario.sitios ?? []).forEach((idSitio) => sumar(idSitio, "usuarios"));
  });

  return conteos;
}
