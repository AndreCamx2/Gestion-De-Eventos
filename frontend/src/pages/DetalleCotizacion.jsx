import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { AvisoError, Boton, CabeceraPagina, Esqueleto, EstadoBadge, EstadoVacio, Tarjeta } from "../components/ui";
import SesionVencida from "../components/SesionVencida";
import { hoyLocal } from "../utils/inicioCifras";
import DetalleConceptos from "./cotizaciones/DetalleConceptos";
import MovimientosCotizacion from "./cotizaciones/MovimientosCotizacion";
import PanelAceptacion from "./cotizaciones/PanelAceptacion";
import PanelVigencia, { AvisoAceptacionVencida } from "./cotizaciones/PanelVigencia";
import { estadoVisible, fechaCorta, numeroCotizacion, vigencia } from "./cotizaciones/cotizaciones";
import {
  datosCliente,
  diaCorto,
  fechaDelEvento,
  idDeRuta,
  nombreGarantia,
  progreso,
  puedeAceptar,
  puedeExtender,
  resumenCancelacion,
  textoAforo,
  textoCreacion,
} from "./cotizaciones/detalleCotizacion";
import { pesos } from "./cotizaciones/nuevaCotizacion";
import { useDetalleCotizacion } from "./cotizaciones/useDetalleCotizacion";
import "../styles/detalle-cotizacion.css";

function ChipVigencia({ cotizacion, hoy }) {
  const v = vigencia(cotizacion, hoy);
  if (!v.nota) return null;
  const conFecha = v.fecha !== "—" && v.tono !== "bloqueado";
  const nota = v.tono === "bloqueado" ? `bloqueado hasta el ${v.fecha}` : v.nota;
  const texto = `${nota[0].toUpperCase()}${nota.slice(1)}${conFecha ? ` · ${v.fecha}` : ""}`;
  return <span className={`dc-chip dc-chip--${v.tono}`}>{texto}</span>;
}

function Progreso({ cotizacion, hoy }) {
  if (cotizacion.estado === "cancelado") return null;
  return (
    <ol className="dc-progreso" aria-label="Progreso">
      {progreso(cotizacion, hoy).map((paso) => (
        <li key={paso.clave} className="dc-progreso__paso" data-hecho={paso.hecho || undefined}>
          <span className="dc-progreso__barra" aria-hidden="true" />
          <span className="dc-progreso__texto">
            {paso.texto}
            <span className="visually-hidden">{paso.hecho ? " (hecho)" : " (pendiente)"}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Dato({ etiqueta, principal, secundario }) {
  return (
    <div className="dc-dato">
      <p className="dc-dato__etiqueta">{etiqueta}</p>
      <p className="dc-dato__principal">{principal}</p>
      {secundario && <p className="dc-dato__secundario">{secundario}</p>}
    </div>
  );
}

function PanelConfirmada({ cotizacion, recien }) {
  const g = cotizacion.garantia;
  if (!g || cotizacion.estado !== "confirmado") return null;
  const dia = diaCorto(g.registrada_en);
  return (
    <section
      className={["dc-panel", "dc-panel--confirmada", recien && "dc-panel--recien"].filter(Boolean).join(" ")}
      aria-labelledby="dc-confirmada-titulo"
      role={recien ? "status" : undefined}
    >
      {recien && (
        <span className="dc-panel__check" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5 9-10" />
          </svg>
        </span>
      )}
      <h2 id="dc-confirmada-titulo" className="dc-panel__titulo">{recien ? "¡Evento confirmado!" : "Evento confirmado"}</h2>
      <p className="dc-panel__texto">
        Garantía por {nombreGarantia(g.tipo)} de {pesos(g.monto)}
        {g.registrada_por && `, registrada por ${g.registrada_por}`}
        {dia && ` el ${dia}`}.
        {recien && cotizacion.salon?.nombre && ` El salón ${cotizacion.salon.nombre} queda reservado el ${fechaCorta(cotizacion.fecha_evento)}.`}
      </p>
    </section>
  );
}

function PanelCancelada({ cotizacion }) {
  const c = resumenCancelacion(cotizacion);
  if (!c) return null;
  return (
    <section className="dc-panel dc-panel--cancelada" aria-labelledby="dc-cancelada-titulo">
      <h2 id="dc-cancelada-titulo" className="dc-panel__titulo">Cotización cancelada</h2>
      <p className="dc-panel__texto">
        {[c.dia && `El ${c.dia}`, c.por && `por ${c.por}`].filter(Boolean).join(" ")}
        {c.penalizacion != null && ` · penalización del ${c.penalizacion}%`}
        {c.retenido != null && ` (${pesos(c.retenido)} retenidos)`}.
      </p>
      {c.motivo && <p className="dc-panel__cita">“{c.motivo}”</p>}
    </section>
  );
}

function Contenido({ d, hoy }) {
  const c = d.cotizacion;
  const cliente = datosCliente(c.cliente);

  return (
    <>
      <Progreso cotizacion={c} hoy={hoy} />

      <div className="dc-layout">
        <div className="dc-principal">
          <div className="dc-datos">
            <Dato etiqueta="Cliente" principal={cliente.principal} secundario={cliente.secundario} />
            <Dato
              etiqueta="Salón"
              principal={[c.salon?.nombre, c.montaje?.nombre].filter(Boolean).join(" · ")}
              secundario={textoAforo(c)}
            />
            <Dato etiqueta="Evento" principal={fechaDelEvento(c.fecha_evento)} secundario={textoCreacion(c)} />
          </div>
          <DetalleConceptos cotizacion={c} />
          <MovimientosCotizacion d={d} />
        </div>

        <div className="dc-lateral">
          {puedeExtender(c) && <PanelVigencia d={d} />}
          {c.vencida && <AvisoAceptacionVencida />}
          {puedeAceptar(c) && <PanelAceptacion d={d} />}
          <PanelConfirmada cotizacion={c} recien={d.recienConfirmada} />
          <PanelCancelada cotizacion={c} />
        </div>
      </div>
    </>
  );
}

export default function DetalleCotizacion() {
  const { id } = useParams();
  const d = useDetalleCotizacion(idDeRuta(id));
  const hoy = useMemo(() => hoyLocal(), [d.cotizacion]);
  const c = d.cotizacion;

  let cuerpo;
  if (d.cargando && !c) {
    cuerpo = (
      <Tarjeta>
        <Esqueleto filas={4} avatar={false} columnas={2} etiqueta="Cargando la cotización…" />
      </Tarjeta>
    );
  } else if (d.errorCarga === "noExiste") {
    cuerpo = (
      <Tarjeta>
        <EstadoVacio
          titulo="No encontramos esta cotización"
          texto="Puede que no exista o que sea de un sitio que no administras."
          accion={<Boton as={Link} to="/cotizaciones" variante="secundario">Ver cotizaciones</Boton>}
        />
      </Tarjeta>
    );
  } else if (d.errorCarga === "sesion") {
    cuerpo = (
      <Tarjeta>
        <EstadoVacio titulo="Tu sesión expiró" texto="Vuelve a entrar con el aviso de abajo para ver la cotización." />
      </Tarjeta>
    );
  } else if (d.errorCarga) {
    cuerpo = (
      <Tarjeta>
        <AvisoError tipo={d.errorCarga === "permiso" ? "permiso" : "servidor"} onReintentar={d.cargar} />
      </Tarjeta>
    );
  } else if (c) {
    cuerpo = <Contenido d={d} hoy={hoy} />;
  }

  return (
    <div className="detalle-cotizacion">
      <div>
        <nav aria-label="Ruta" className="dc-ruta">
          <Link to="/cotizaciones">Cotizaciones</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{c ? numeroCotizacion(c.id) : "Detalle"}</span>
        </nav>
        <CabeceraPagina
          titulo={c ? c.cliente?.nombre : "Cotización"}
          subtitulo={
            c && (
              <span className="dc-etiquetas">
                <EstadoBadge estado={estadoVisible(c)} className="dc-estado" />
                <ChipVigencia cotizacion={c} hoy={hoy} />
              </span>
            )
          }
          acciones={
            c && (
              <Boton variante="secundario" disabled title="Disponible cuando esté la vista para imprimir">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M7 14h10v7H7z" />
                </svg>
                Imprimir o PDF
              </Boton>
            )
          }
        />
      </div>

      {cuerpo}

      <SesionVencida visible={d.sesionVencida} onReingreso={d.alVolverAEntrar} />
    </div>
  );
}
