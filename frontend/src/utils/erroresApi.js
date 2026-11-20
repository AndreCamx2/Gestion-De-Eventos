// Clasificador de errores 400 del API, compartido por todos los formularios.

export const textoError = (e) => (Array.isArray(e) ? e.join(" ") : String(e));

export function erroresDesdeApi(body, camposDelFormulario) {
  const { detail, non_field_errors, ...porCampo } = body ?? {};
  const campos = {};
  const sueltos = [];
  Object.entries(porCampo).forEach(([campo, e]) => {
    if (camposDelFormulario.includes(campo)) campos[campo] = textoError(e);
    else sueltos.push(`${campo}: ${textoError(e)}`);
  });
  if (detail) sueltos.push(textoError(detail));
  if (non_field_errors) sueltos.push(textoError(non_field_errors));
  return { campos, general: sueltos.join(" | ") || null };
}
