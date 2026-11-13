import "./Tarjeta.css";

export default function Tarjeta({ as: Componente = "div", className = "", children, ...resto }) {
  return (
    <Componente {...resto} className={["tarjeta", className].filter(Boolean).join(" ")}>
      {children}
    </Componente>
  );
}
