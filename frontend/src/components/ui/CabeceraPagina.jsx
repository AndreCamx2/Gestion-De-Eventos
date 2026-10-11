import "./CabeceraPagina.css";

// Cabecera de pantalla (guía, sección 5): antetítulo, título y subtítulo a la
// izquierda; las acciones (por ejemplo, un <Boton>) a la derecha, alineadas abajo.
//
// El título se pinta como <h1>. Mientras haya pantallas sin migrar,
// DashboardLayout también pinta un <h1> invisible con el nombre de la pestaña;
// cuando todas usen CabeceraPagina, ese <h1> invisible se quita.
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
