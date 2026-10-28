import "./EstadoVacio.css";

// Estado vacío (maqueta CasosLimite, "Lista vacía"): ícono, título, texto y una
// acción opcional, por ejemplo <Boton>Armar la primera</Boton>.
// - icono: si no se pasa, se usan las tres barras de la maqueta (decorativas).
// - nivel: etiqueta del título ("h2" por defecto; usa "h3" si va dentro de una sección con h2).
// No trae caja propia: envuélvelo en Tarjeta o en la caja de la lista.
function BarrasVacias() {
  return (
    <span className="estado-vacio__barras">
      <span className="estado-vacio__barra estado-vacio__barra--baja" />
      <span className="estado-vacio__barra estado-vacio__barra--alta" />
      <span className="estado-vacio__barra estado-vacio__barra--minima" />
    </span>
  );
}

export default function EstadoVacio({ titulo, texto, accion, icono, nivel: Titulo = "h2", className = "", ...resto }) {
  return (
    <div {...resto} className={["estado-vacio", className].filter(Boolean).join(" ")}>
      <div className="estado-vacio__icono" aria-hidden="true">
        {icono ?? <BarrasVacias />}
      </div>
      <Titulo className="estado-vacio__titulo">{titulo}</Titulo>
      {texto && <p className="estado-vacio__texto">{texto}</p>}
      {accion && <div className="estado-vacio__accion">{accion}</div>}
    </div>
  );
}
