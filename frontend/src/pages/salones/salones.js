// Funciones de la pantalla de Salones que no usan estado: formato de números y
// medidas, aforo máximo y lo que se envía al editar. Las usan Salones.jsx y las
// piezas de esta carpeta.

export const formatoNumero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

// "20.00" → "20 m"; "4.50" → "4,5 m". Sin dato → "—" (nunca un número inventado).
export function metros(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  return `${formatoNumero.format(Number(valor))} m`;
}

export function aforoMaximo(habilitados) {
  return habilitados.length ? Math.max(...habilitados.map((h) => h.aforo)) : null;
}

// ===== Editar salón (SGDE-88) =====

// El API manda "20.00": en el campo se ve "20" (o "4,5" si tiene decimales,
// como se escribe en Colombia). Sin dato → "".
function medidaEnCampo(valor) {
  if (valor === null || valor === undefined || valor === "") return "";
  return String(Number(valor)).replace(".", ",");
}

export function formDesdeSalon(salon) {
  return {
    nombre: salon.nombre,
    ancho: medidaEnCampo(salon.ancho),
    altura: medidaEnCampo(salon.altura),
    foto_url: salon.foto_url ?? "",
  };
}

// "4,5" → 4.5; vacío → null. NaN si no es un número.
function medidaComoNumero(texto) {
  const limpio = String(texto ?? "").trim().replace(",", ".");
  return limpio === "" ? null : Number(limpio);
}

export function validarSalon(form) {
  const errores = {};
  if (!form.nombre.trim()) errores.nombre = "Escribe el nombre del salón.";
  for (const campo of ["ancho", "altura"]) {
    const n = medidaComoNumero(form[campo]);
    if (n !== null && (Number.isNaN(n) || n <= 0)) errores[campo] = "Escribe los metros: un número mayor que 0.";
  }
  return errores;
}

// Solo lo que cambió, para el PATCH: {} si nada cambió. Las medidas se comparan
// como números ("20" y "20.00" son lo mismo).
export function cambiosSalon(form, salon) {
  const cambios = {};
  if (form.nombre.trim() !== salon.nombre) cambios.nombre = form.nombre;
  for (const campo of ["ancho", "altura"]) {
    const nuevo = medidaComoNumero(form[campo]);
    const actual = salon[campo] === null || salon[campo] === undefined ? null : Number(salon[campo]);
    if (nuevo !== actual) cambios[campo] = form[campo];
  }
  if (form.foto_url.trim() !== (salon.foto_url ?? "")) cambios.foto_url = form.foto_url;
  return cambios;
}

// ===== Editar aforo (SGDE-88) =====

export function validarAforo(texto) {
  if (!/^\d+$/.test(String(texto).trim()) || Number(texto) <= 0) {
    return "Escribe cuántas personas caben: un número entero mayor que 0.";
  }
  return null;
}
