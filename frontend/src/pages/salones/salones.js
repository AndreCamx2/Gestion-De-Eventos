// Funciones de la pantalla de Salones que no usan estado: búsqueda, formato de
// números y medidas, aforo máximo y lo que se envía al editar. Las usan
// useSalones.js y las piezas de esta carpeta.

// Minúsculas y sin tildes: así "bolivar" encuentra a "Bolívar".
export function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

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

export const MAX_NOMBRE_SALON = 100;
// Salon.altura y Salon.ancho: 5 dígitos con 2 decimales.
const MEDIDA_MAXIMA = 999.99;

export function validarSalon(form) {
  const errores = {};
  const nombre = form.nombre.trim();
  if (!nombre) errores.nombre = "Escribe el nombre del salón.";
  else if (nombre.length > MAX_NOMBRE_SALON) errores.nombre = `Máximo ${MAX_NOMBRE_SALON} caracteres.`;
  for (const campo of ["ancho", "altura"]) {
    const texto = String(form[campo] ?? "").trim().replace(",", ".");
    if (texto === "") continue;
    if (!/^\d+(\.\d{1,2})?$/.test(texto) || Number(texto) <= 0) {
      errores[campo] = "Escribe los metros: un número mayor que 0, con máximo dos decimales.";
    } else if (Number(texto) > MEDIDA_MAXIMA) {
      errores[campo] = "Máximo 999,99 metros.";
    }
  }
  const foto = (form.foto_url ?? "").trim();
  if (foto && !esEnlaceWeb(foto)) errores.foto_url = "Pega un enlace que empiece por https://";
  return errores;
}

function esEnlaceWeb(texto) {
  try {
    return ["http:", "https:"].includes(new URL(texto).protocol);
  } catch {
    return false;
  }
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

export const AFORO_MAXIMO = 100000;

export function validarAforo(texto) {
  if (!/^\d+$/.test(String(texto).trim()) || Number(texto) <= 0) {
    return "Escribe cuántas personas caben: un número entero mayor que 0.";
  }
  if (Number(texto) > AFORO_MAXIMO) return "El aforo no puede pasar de 100.000 personas.";
  return null;
}
