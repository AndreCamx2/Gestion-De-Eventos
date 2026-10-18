// "4165000.00" → "$ 4.165.000" (formato colombiano, sin decimales). Sin Intl,
// para que se vea igual en todos los teléfonos.
export function pesos(valor) {
  const numero = Math.round(Number(valor) || 0);
  const signo = numero < 0 ? "-" : "";
  const miles = String(Math.abs(numero)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${signo}$ ${miles}`;
}

// "12.50" o "12,50" → "12.50" (el API espera punto decimal). Vacío → null.
export function decimalDelUsuario(texto) {
  const limpio = String(texto ?? "").trim().replace(",", ".");
  return limpio === "" ? null : limpio;
}
