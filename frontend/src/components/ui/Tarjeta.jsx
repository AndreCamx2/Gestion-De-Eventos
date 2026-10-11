import "./Tarjeta.css";

// Contenedor blanco con borde y radio. Con `as` se puede pintar como
// <section>, <article>, etc.; con `className` se ajusta el padding u otros detalles.
export default function Tarjeta({ as: Componente = "div", className = "", children, ...resto }) {
  return (
    <Componente {...resto} className={["tarjeta", className].filter(Boolean).join(" ")}>
      {children}
    </Componente>
  );
}
