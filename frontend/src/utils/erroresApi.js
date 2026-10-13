// Clasificador de errores 400 del API, compartido por todos los formularios.
//
// Cuando el backend rechaza un formulario responde algo como:
//   { "nombre": ["Este campo es obligatorio."], "non_field_errors": ["..."] }
//
// Esta función reparte esas quejas:
//   - las de un campo que el formulario conoce van en `campos` ({campo: texto}),
//     para mostrarlas justo debajo de su input;
//   - el resto (detail, non_field_errors, campos que la pantalla no muestra)
//     se junta en `general`, para mostrarlo al final del formulario.
//
// Cada pantalla le pasa su propia lista de campos, así sirve para Clientes,
// Conceptos y cualquier formulario nuevo.

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
