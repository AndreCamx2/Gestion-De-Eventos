import "./TablaContenedor.css";

// Caja para tablas: en pantallas angostas la tabla se desplaza en horizontal
// dentro de la caja, sin romper la página (guía, sección 5).
// `etiqueta` describe la tabla para lectores de pantalla (por ejemplo,
// "Listado de cotizaciones"). Con etiqueta, la caja también recibe el foco para
// poder desplazarla con las flechas del teclado.
export default function TablaContenedor({ etiqueta, className = "", children, ...resto }) {
  const accesible = etiqueta ? { role: "region", "aria-label": etiqueta, tabIndex: 0 } : {};

  return (
    <div {...accesible} {...resto} className={["tabla-contenedor", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
