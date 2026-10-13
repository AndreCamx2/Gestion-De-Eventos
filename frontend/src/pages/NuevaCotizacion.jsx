import { Link } from "react-router-dom";
import { AvisoError, CabeceraPagina, Esqueleto, EstadoVacio, Tarjeta } from "../components/ui";
import SesionVencida from "../components/SesionVencida";
import CotizacionGuardada from "./cotizaciones/CotizacionGuardada";
import ResumenCotizacion from "./cotizaciones/ResumenCotizacion";
import SeccionCliente from "./cotizaciones/SeccionCliente";
import SeccionConceptos from "./cotizaciones/SeccionConceptos";
import SeccionEvento from "./cotizaciones/SeccionEvento";
import { useNuevaCotizacion } from "./cotizaciones/useNuevaCotizacion";
import "../styles/nueva-cotizacion.css";

function Contenido({ c }) {
  if (c.cargando) {
    return (
      <Tarjeta>
        <Esqueleto filas={4} avatar={false} columnas={2} etiqueta="Cargando salones y conceptos…" />
      </Tarjeta>
    );
  }

  if (c.errorCarga === "sesion") {
    return (
      <Tarjeta>
        <EstadoVacio titulo="Tu sesión expiró" texto="Vuelve a entrar con el aviso de abajo para armar la cotización." />
      </Tarjeta>
    );
  }

  if (c.errorCarga) {
    return (
      <Tarjeta>
        <AvisoError tipo={c.errorCarga} onReintentar={c.cargar} />
      </Tarjeta>
    );
  }

  if (c.guardada) {
    return <CotizacionGuardada cotizacion={c.guardada} onOtra={c.empezarOtra} />;
  }

  return (
    <form className="nc-layout" onSubmit={c.guardar} noValidate>
      <div className="nc-pasos">
        <SeccionCliente c={c} />
        <SeccionEvento c={c} />
        <SeccionConceptos c={c} />
      </div>
      <ResumenCotizacion c={c} />
    </form>
  );
}

export default function NuevaCotizacion() {
  const c = useNuevaCotizacion();

  return (
    <div className="nueva-cotizacion">
      <div>
        <nav aria-label="Ruta" className="nc-ruta">
          <Link to="/cotizaciones">Cotizaciones</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Nueva</span>
        </nav>
        <CabeceraPagina titulo="Nueva cotización" />
      </div>

      <Contenido c={c} />

      <SesionVencida visible={c.sesionVencida} onReingreso={c.alVolverAEntrar} />
    </div>
  );
}
