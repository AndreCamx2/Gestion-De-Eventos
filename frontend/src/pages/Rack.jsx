import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { obtenerCalendario } from "../api/calendario";
import { listarSalones } from "../api/salones";
import DialogoDiaSalon from "../components/bloqueo/DialogoDiaSalon";
import SesionVencida from "../components/SesionVencida";
import {
  AvisoError, Boton, CabeceraPagina, Esqueleto, EstadoVacio, LeyendaEstados, Tarjeta,
} from "../components/ui";
import { fechaISO, hoyLocal, mesCorto, sumarDias } from "../utils/inicioCifras";
import { sitiosDeSalones } from "../utils/sitiosDeSalones";
import RackRejilla from "./rack/RackRejilla";
import { DIAS_POR_PAGINA, armarRejilla, rangoDeDias } from "./rack/rack";
import "../styles/rack.css";

// Rack de salones (SGDE-69): ocupación por día de cada salón, con bloqueo y
// liberación desde el panel del día. Las reglas de la rejilla están en pages/rack/rack.js.
const ESTADOS_LEYENDA = ["disponible", "cotizado", "bloqueado", "confirmado"];

function textoRango(dias) {
  const [primero, ultimo] = [dias[0], dias.at(-1)];
  return `${primero.getDate()} ${mesCorto(primero)} – ${ultimo.getDate()} ${mesCorto(ultimo)} ${ultimo.getFullYear()}`;
}

export default function Rack() {
  const hoy = useMemo(() => hoyLocal(), []);
  const [inicio, setInicio] = useState(hoy);
  // Lo último que llegó del API, junto con el rango al que corresponde.
  const [datos, setDatos] = useState(null); // { dias, salones, cotizaciones }
  const [cargando, setCargando] = useState(true);
  // Error al cargar: null | "sesion" (401) | "permiso" (403) | "servidor".
  const [errorCarga, setErrorCarga] = useState(null);
  const [sesionVencida, setSesionVencida] = useState(false);
  const [filtroSitio, setFiltroSitio] = useState("todos");
  const [panel, setPanel] = useState(null); // { salonId, fecha: "AAAA-MM-DD" }

  const pedidoRef = useRef(0); // una respuesta vieja no pisa a la nueva
  const abridorRef = useRef(null); // celda que abrió el panel, para devolverle el foco
  const sesionRef = useRef(null);

  async function cargar(desde) {
    const pedido = ++pedidoRef.current;
    const dias = rangoDeDias(desde);
    setCargando(true);
    setErrorCarga(null);
    try {
      const [salones, cotizaciones] = await Promise.all([
        listarSalones(),
        obtenerCalendario({ desde: fechaISO(dias[0]), hasta: fechaISO(dias.at(-1)) }),
      ]);
      if (pedido !== pedidoRef.current) return;
      setDatos({ dias, salones, cotizaciones });
    } catch (err) {
      if (pedido !== pedidoRef.current) return;
      if (err.status === 401) {
        setErrorCarga("sesion");
        setSesionVencida(true);
      } else {
        setErrorCarga(err.status === 403 ? "permiso" : "servidor");
      }
    } finally {
      if (pedido === pedidoRef.current) setCargando(false);
    }
  }

  useEffect(() => {
    cargar(inicio);
  }, [inicio]);

  // El foco vuelve a la celda en un efecto, cuando el panel ya se quitó (ERR-017).
  useEffect(() => {
    if (panel === null && abridorRef.current?.isConnected) {
      abridorRef.current.focus();
      abridorRef.current = null;
    }
  }, [panel]);

  // Los chips de sitio salen de los salones (sitio_nombre, SGDE-104).
  const sitiosConSalones = useMemo(() => sitiosDeSalones(datos?.salones ?? []), [datos]);
  const salonesVisibles = useMemo(
    () => (datos?.salones ?? []).filter((s) => filtroSitio === "todos" || s.sitio === filtroSitio),
    [datos, filtroSitio],
  );
  const rejilla = useMemo(
    () => (datos ? armarRejilla(datos.salones, datos.cotizaciones, datos.dias) : {}),
    [datos],
  );

  const salonPanel = panel && datos?.salones.find((s) => s.id === panel.salonId);
  const celdaPanel = salonPanel && rejilla[panel.salonId]?.[panel.fecha];

  function abrirPanel(salon, dia, boton) {
    abridorRef.current = boton;
    setPanel({ salonId: salon.id, fecha: fechaISO(dia) });
  }

  function alVolverAEntrar() {
    setSesionVencida(false);
    if (errorCarga === "sesion") cargar(inicio);
  }

  const dias = rangoDeDias(inicio);
  const sinDatos = !datos;

  return (
    <div className="rack">
      <CabeceraPagina antetitulo="Disponibilidad" titulo="Rack de salones" />

      <div className="rack__controles">
        <div className="rack__navegacion" role="group" aria-label="Cambiar de fechas">
          <Boton variante="secundario" onClick={() => setInicio(sumarDias(inicio, -DIAS_POR_PAGINA))}>
            ← Anterior
          </Boton>
          <Boton variante="secundario" onClick={() => setInicio(hoy)} disabled={fechaISO(inicio) === fechaISO(hoy)}>
            Hoy
          </Boton>
          <Boton variante="secundario" onClick={() => setInicio(sumarDias(inicio, DIAS_POR_PAGINA))}>
            Siguiente →
          </Boton>
          <p className="rack__rango" aria-live="polite">{textoRango(dias)}</p>
        </div>

        {sitiosConSalones.length > 1 && (
          <div className="rack__sitios" role="group" aria-label="Filtrar por venue">
            {[{ id: "todos", nombre: "Todos" }, ...sitiosConSalones].map((sitio) => (
              <button
                key={sitio.id}
                type="button"
                className="rack__sitio"
                aria-pressed={filtroSitio === sitio.id}
                onClick={() => setFiltroSitio(sitio.id)}
              >
                {sitio.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      <Tarjeta className="rack__tarjeta" aria-busy={cargando}>
        {errorCarga === "sesion" ? (
          <EstadoVacio titulo="Tu sesión expiró" texto="Vuelve a entrar con el aviso de abajo para ver el rack." />
        ) : errorCarga ? (
          <AvisoError tipo={errorCarga} onReintentar={() => cargar(inicio)} />
        ) : sinDatos ? (
          <Esqueleto filas={4} avatar={false} columnas={5} etiqueta="Cargando el rack…" />
        ) : datos.salones.length === 0 ? (
          <EstadoVacio
            titulo="Aún no hay salones"
            texto="Crea un salón y habilita sus montajes para ver aquí su ocupación."
            accion={<Boton as={Link} to="/salones" variante="oscuro">Ir a Salones</Boton>}
          />
        ) : (
          <RackRejilla
            salones={salonesVisibles}
            dias={datos.dias}
            rejilla={rejilla}
            hoy={hoy}
            onAbrir={abrirPanel}
          />
        )}
        <LeyendaEstados estados={ESTADOS_LEYENDA} className="rack__leyenda" />
      </Tarjeta>

      {celdaPanel && (
        <DialogoDiaSalon
          salon={salonPanel}
          dia={datos.dias.find((d) => fechaISO(d) === panel.fecha)}
          esPasado={panel.fecha < fechaISO(hoy)}
          cotizaciones={celdaPanel.cotizaciones}
          onCambio={() => cargar(inicio)}
          onCerrar={() => setPanel(null)}
          onSesionVencida={() => setSesionVencida(true)}
          sesionVencida={sesionVencida}
          onEntrarDeNuevo={(boton) => sesionRef.current?.abrir({ focoAlVolver: boton })}
        />
      )}

      <SesionVencida ref={sesionRef} visible={sesionVencida} onReingreso={alVolverAEntrar} />
    </div>
  );
}
