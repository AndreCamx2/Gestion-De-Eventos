import "./TablaContenedor.css";

export default function TablaContenedor({ etiqueta, className = "", children, ...resto }) {
  const accesible = etiqueta ? { role: "region", "aria-label": etiqueta, tabIndex: 0 } : {};

  return (
    <div {...accesible} {...resto} className={["tabla-contenedor", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
