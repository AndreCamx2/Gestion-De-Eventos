import { EstadoVacio, Tarjeta } from "../../components/ui";
import { fechaLarga } from "../../utils/inicioCifras";

// Inicio de cliente y proveedor. Su único permiso en el panel es /inicio: aquí no hay enlaces ni llamadas al API.
const TEXTO_SIN_PANEL = {
  cliente: "Pronto verás aquí tus cotizaciones y eventos.",
  proveedor: "Pronto verás aquí los pedidos de tus eventos.",
};

export default function InicioSinPanel({ hoy, nombre, rol }) {
  return (
    <>
      <header className="inicio-saludo inicio-saludo--simple">
        <div className="inicio-saludo__textos">
          <p className="inicio-saludo__fecha">
            <span className="inicio-saludo__punto" aria-hidden="true" />
            {fechaLarga(hoy)}
          </p>
          <h1 className="inicio-saludo__titulo">Hola, {nombre}.</h1>
        </div>
      </header>
      <Tarjeta>
        <EstadoVacio
          titulo="Tu cuenta está activa"
          texto={TEXTO_SIN_PANEL[rol] ?? "Pronto verás aquí la información de tu cuenta."}
        />
      </Tarjeta>
    </>
  );
}
