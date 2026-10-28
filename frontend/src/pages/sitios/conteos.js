// Conteos de cada tarjeta de sitio (SGDE-83): salones, conceptos activos y usuarios.
//
// /api/sitios/ no trae estos números, así que se calculan en el frontend con las
// listas que ya existen (/salones/, /conceptos/ y /usuarios/). Es una función sin
// estado: recibe las listas y devuelve los números.
// Candidato a pasar al API en el futuro (con annotate/Count en SitioSerializer),
// para no descargar tres listas completas solo para contar.
//
// - sitios: lista de /api/sitios/.
// - salones, conceptos, usuarios: la lista que devolvió el API, o null si esa
//   petición falló. Con null, ese número queda en null y la tarjeta muestra "—".
//
// Devuelve { [idSitio]: { salones, conceptos, usuarios } }.
export function contarPorSitio(sitios, { salones, conceptos, usuarios }) {
  const conteos = {};
  for (const sitio of sitios) {
    conteos[sitio.id] = {
      salones: salones ? 0 : null,
      conceptos: conceptos ? 0 : null,
      usuarios: usuarios ? 0 : null,
    };
  }

  // Un id que no está en `sitios` (no debería pasar con el filtro por sitio) se ignora.
  const sumar = (idSitio, campo) => {
    if (conteos[idSitio]) conteos[idSitio][campo] += 1;
  };

  salones?.forEach((salon) => sumar(salon.sitio, "salones"));
  conceptos?.forEach((concepto) => {
    if (concepto.activo) sumar(concepto.sitio, "conceptos");
  });
  // /usuarios/ ya trae solo los activos; cada usuario suma en cada uno de sus sitios.
  usuarios?.forEach((usuario) => {
    (usuario.sitios ?? []).forEach((idSitio) => sumar(idSitio, "usuarios"));
  });

  return conteos;
}
