import { Link } from "react-router-dom";
import { Boton, EstadoVacio, Tarjeta } from "../../components/ui";
import { fechaLarga } from "../../utils/inicioCifras";
import ResumenProveedor from "./ResumenProveedor";

const TEXTO_SIN_PANEL = {
  cliente: "Consulta las propuestas que te ha enviado tu asesor y el estado de tus eventos.",
};

// El cliente llega a "Mis cotizaciones" (SGDE-127) desde aquí.
const ACCION_SIN_PANEL = {
  cliente: <Boton as={Link} to="/mis-cotizaciones">Ver mis cotizaciones</Boton>,
};

export default function InicioSinPanel({ hoy, nombre, rol, stock, onReintentarStock }) {
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
      {rol === "proveedor" ? (
        <ResumenProveedor stock={stock} onReintentar={onReintentarStock} />
      ) : (
        <Tarjeta>
          <EstadoVacio
            titulo="Tu cuenta está activa"
            texto={TEXTO_SIN_PANEL[rol] ?? "Pronto verás aquí la información de tu cuenta."}
            accion={ACCION_SIN_PANEL[rol]}
          />
        </Tarjeta>
      )}
    </>
  );
}
