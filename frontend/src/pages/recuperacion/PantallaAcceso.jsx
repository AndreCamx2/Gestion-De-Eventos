import { Link } from "react-router-dom";
import "../../styles/acceso.css";

export default function PantallaAcceso({ titulo, subtitulo, children, onSubmit }) {
  const Contenedor = onSubmit ? "form" : "div";

  return (
    <div className="acceso">
      <header className="acceso__cabecera">
        <Link to="/login" className="acceso-logo">
          <span className="acceso-logo__marca" aria-hidden="true">S</span>
          SGDE
        </Link>
      </header>

      <main className="acceso__cuerpo">
        <div className="acceso-tarjeta-envoltura">
          <span className="acceso-circulo acceso-circulo--grande" aria-hidden="true" />
          <span className="acceso-circulo acceso-circulo--mediano" aria-hidden="true" />
          <span className="acceso-circulo acceso-circulo--pequeno" aria-hidden="true" />

          <Contenedor className="acceso-tarjeta" {...(onSubmit ? { noValidate: true, onSubmit } : {})}>
            <div>
              <h1 className="acceso-tarjeta__titulo">{titulo}</h1>
              {subtitulo && <p className="acceso-tarjeta__subtitulo">{subtitulo}</p>}
            </div>
            {children}
          </Contenedor>
        </div>
      </main>
    </div>
  );
}
