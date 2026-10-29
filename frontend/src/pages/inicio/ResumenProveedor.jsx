import { Link } from "react-router-dom";
import { AvisoError, Boton, Esqueleto, EstadoVacio, Tarjeta } from "../../components/ui";
import { numero } from "../../utils/inicioCifras";
import { fechaActualizado } from "../proveedores/proveedores";
import { resumenInventario } from "./inicio";

function IrAMiStock() {
  return (
    <Boton as={Link} to="/mi-stock" variante="secundario">
      Ir a Mi stock
    </Boton>
  );
}

function Cifra({ etiqueta, valor, tono }) {
  return (
    <div className={["inicio-inventario__cifra", tono && `inicio-inventario__cifra--${tono}`].filter(Boolean).join(" ")}>
      <dt>{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

export default function ResumenProveedor({ stock, onReintentar }) {
  if (stock.fase === "cargando") {
    return (
      <Tarjeta>
        <Esqueleto filas={3} avatar={false} etiqueta="Cargando tu inventario…" />
      </Tarjeta>
    );
  }

  if (stock.fase === "error") {
    if (stock.error === "sinVincular") {
      return (
        <Tarjeta>
          <EstadoVacio
            titulo="Tu usuario todavía no está vinculado a un proveedor"
            texto="Pídele al administrador que lo vincule."
          />
        </Tarjeta>
      );
    }
    if (stock.error === "sesion") {
      return (
        <Tarjeta>
          <EstadoVacio titulo="Tu sesión expiró" texto="Vuelve a entrar con el aviso de abajo para ver tu inventario." />
        </Tarjeta>
      );
    }
    return (
      <Tarjeta>
        <AvisoError tipo="servidor" onReintentar={onReintentar} />
      </Tarjeta>
    );
  }

  const resumen = resumenInventario(stock.datos);

  if (resumen.total === 0) {
    return (
      <Tarjeta>
        <EstadoVacio
          titulo="Aún no tienes elementos en tu stock"
          texto="Agrega el primero: qué ofreces, cuántos tienes y cuánto vale cada uno."
          accion={<IrAMiStock />}
        />
      </Tarjeta>
    );
  }

  return (
    <Tarjeta as="section" className="inicio-inventario" aria-labelledby="inicio-inventario-titulo">
      <h2 id="inicio-inventario-titulo" className="inicio-bloque__titulo">Tu inventario</h2>
      <dl className="inicio-inventario__cifras">
        <Cifra etiqueta="Elementos" valor={numero(resumen.total)} />
        <Cifra etiqueta="Agotados" valor={numero(resumen.agotados)} tono={resumen.agotados > 0 ? "alerta" : null} />
        <Cifra etiqueta="Última actualización" valor={fechaActualizado(resumen.ultima)} />
      </dl>
      <div className="inicio-inventario__accion">
        <IrAMiStock />
      </div>
    </Tarjeta>
  );
}
