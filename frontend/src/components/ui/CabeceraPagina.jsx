import "./CabeceraPagina.css";

// Cabecera de pantalla (guía, sección 5): antetítulo, título y subtítulo a la
// izquierda; las acciones (por ejemplo, un <Boton>) a la derecha, alineadas abajo.
//
// El título se pinta como <h1>: es el único de la pantalla (DashboardLayout no
// pinta ninguno desde SGDE-85).
export default function CabeceraPagina({ antetitulo, titulo, subtitulo, acciones, className = "" }) {
  return (
    <header className={["cabecera-pagina", className].filter(Boolean).join(" ")}>
      <div className="cabecera-pagina__textos">
        {antetitulo && <p className="cabecera-pagina__antetitulo">{antetitulo}</p>}
        <h1 className="cabecera-pagina__titulo">{titulo}</h1>
        {subtitulo && <p className="cabecera-pagina__subtitulo">{subtitulo}</p>}
      </div>
      {acciones && <div className="cabecera-pagina__acciones">{acciones}</div>}
    </header>
  );
}
