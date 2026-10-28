import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AvisoError, Boton, CabeceraPagina, Esqueleto, EstadoVacio, Tarjeta } from "../components/ui";
import SesionVencida from "../components/SesionVencida";
import CotizacionGuardada from "./cotizaciones/CotizacionGuardada";
import ResumenCotizacion from "./cotizaciones/ResumenCotizacion";
import SeccionCliente from "./cotizaciones/SeccionCliente";
import SeccionConceptos from "./cotizaciones/SeccionConceptos";
import SeccionEvento from "./cotizaciones/SeccionEvento";
import { numeroCotizacion } from "./cotizaciones/cotizaciones";
import { idDeRuta } from "./cotizaciones/detalleCotizacion";
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

  if (c.errorCarga === "noExiste") {
    return (
      <Tarjeta>
        <EstadoVacio
          titulo="No encontramos esta cotización"
          texto="Puede que no exista o que sea de un venue que no administras."
          accion={<Boton as={Link} to="/cotizaciones" variante="secundario">Ver cotizaciones</Boton>}
        />
      </Tarjeta>
    );
  }

  if (c.errorCarga === "noEditable") {
    const bloqueada = c.original?.estado === "bloqueado";
    return (
      <Tarjeta>
        <EstadoVacio
          titulo="Esta cotización ya no se puede editar"
          texto={
            bloqueada
              ? "Está bloqueada: libera el bloqueo desde su detalle para poder cambiarla."
              : "Solo se editan las cotizaciones que aún no se confirman ni se cancelan."
          }
          accion={
            <Boton as={Link} to={`/cotizaciones/${c.original.id}`} variante="secundario">Volver a la cotización</Boton>
          }
        />
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

  if (c.guardada && c.editando) return null;

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

// /cotizaciones/nueva arma una cotización; /cotizaciones/<id>/editar cambia una guardada
// con el mismo formulario (PUT .../edicion/) y al guardar vuelve a su detalle.
export default function NuevaCotizacion() {
  const { id } = useParams();
  const idEditar = id != null ? idDeRuta(id) ?? -1 : null;
  const c = useNuevaCotizacion(idEditar);
  const navigate = useNavigate();

  useEffect(() => {
    if (c.editando && c.guardada) navigate(`/cotizaciones/${c.guardada.id}`, { state: { editada: true } });
  }, [c.editando, c.guardada, navigate]);

  const numero = c.editando && idEditar > 0 ? numeroCotizacion(idEditar) : null;

  return (
    <div className="nueva-cotizacion">
      <div>
        <nav aria-label="Ruta" className="nc-ruta">
          <Link to="/cotizaciones">Cotizaciones</Link>
          <span aria-hidden="true">/</span>
          {numero ? (
            <>
              <Link to={`/cotizaciones/${idEditar}`}>{numero}</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">Editar</span>
            </>
          ) : (
            <span aria-current="page">Nueva</span>
          )}
        </nav>
        <CabeceraPagina titulo={numero ? `Editar cotización ${numero}` : "Nueva cotización"} />
      </div>

      <Contenido c={c} />

      <SesionVencida visible={c.sesionVencida} onReingreso={c.alVolverAEntrar} />
    </div>
  );
}
