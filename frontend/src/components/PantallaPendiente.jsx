import { CabeceraPagina, EstadoVacio, Tarjeta } from "./ui";
import "./PantallaPendiente.css";

// Ruta del panel que todavía no tiene pantalla (por ejemplo, /calendario).
// Trae su propio <h1> en CabeceraPagina, como las demás pantallas: el layout
// ya no pinta uno (SGDE-85).
export default function PantallaPendiente({ titulo }) {
  return (
    <div className="pantalla-pendiente">
      <CabeceraPagina titulo={titulo} />
      <Tarjeta>
        <EstadoVacio
          titulo="Pantalla pendiente de construir"
          texto="Esta sección todavía no está disponible. Mientras tanto, usa las demás pestañas."
        />
      </Tarjeta>
    </div>
  );
}
