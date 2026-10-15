import { Link } from "react-router-dom";
import { Boton, EstadoVacio, Tarjeta } from "../../components/ui";
import { fechaLarga } from "../../utils/inicioCifras";

// Inicio de cliente y proveedor: sin cifras ni llamadas al API. El proveedor tiene
// un enlace a "Mi stock" (SGDE-72); el cliente, por ahora, solo el aviso.
const TEXTO_SIN_PANEL = {
  cliente: "Pronto verás aquí tus cotizaciones y eventos.",
  proveedor: "Revisa y actualiza tu stock: qué ofreces, cuántos hay y cuánto vale cada uno.",
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
          accion={
            rol === "proveedor" && (
              <Boton as={Link} to="/mi-stock" variante="secundario">
                Ir a Mi stock
              </Boton>
            )
          }
        />
      </Tarjeta>
    </>
  );
}
