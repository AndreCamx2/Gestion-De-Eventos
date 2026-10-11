import "./Boton.css";

// Botón de Piedra viva (guía, sección 6).
// variante: "principal" | "oscuro" | "secundario" | "peligro" | "exito".
// Usa una sola variante "principal" por pantalla: la tinta marca la acción principal.
// Con `as={Link}` (y `to="..."`) se pinta como enlace con la misma apariencia.
export default function Boton({
  variante = "principal",
  as: Componente = "button",
  type,
  disabled = false,
  className = "",
  onClick,
  children,
  ...resto
}) {
  const clases = ["boton", `boton--${variante}`, className].filter(Boolean).join(" ");

  if (Componente === "button") {
    return (
      <button {...resto} type={type ?? "button"} className={clases} disabled={disabled} onClick={onClick}>
        {children}
      </button>
    );
  }

  // Un enlace no admite `disabled`: se marca con aria-disabled, sale del orden
  // de tabulación y se bloquea el clic para que no navegue.
  function manejarClic(event) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <Componente
      {...resto}
      className={clases}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : resto.tabIndex}
      onClick={manejarClic}
    >
      {children}
    </Componente>
  );
}
