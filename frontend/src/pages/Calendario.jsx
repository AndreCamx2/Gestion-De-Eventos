import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { obtenerCalendario } from "../api/calendario";
import { listarSalones } from "../api/salones";
import DialogoDiaSalon from "../components/bloqueo/DialogoDiaSalon";
import SesionVencida from "../components/SesionVencida";
import { AvisoError, Boton, CabeceraPagina, EstadoVacio, LeyendaEstados, Tarjeta } from "../components/ui";
import { desdeISO, fechaISO, hoyLocal } from "../utils/inicioCifras";
import { sitiosDeSalones } from "../utils/sitiosDeSalones";
import CalendarioMes, { EsqueletoMes } from "./calendario/CalendarioMes";
import FiltrosCalendario from "./calendario/FiltrosCalendario";
import PanelDia from "./calendario/PanelDia";
import {
  agruparPorDia, claveMes, diaPorDefecto, diasDelMes, leerMes, primerDia, sumarMeses, tituloMes,
} from "./calendario/calendario";
import "../styles/calendario.css";

// Calendario de disponibilidad (SGDE-45): el mes de todos los salones, con el panel
// del día y el mismo bloqueo y liberación del Rack. Las reglas están en calendario/calendario.js.
//
// URL: ?mes=AAAA-MM y ?salon=<id>. Se leen al entrar (o si se navega a la misma
// pantalla con otra URL) y se escriben con replace SOLO desde los botones, nunca
// desde un efecto: así leer y escribir no forman un ciclo ni piden datos dos veces.
const ESTADOS_LEYENDA = ["disponible", "cotizado", "bloqueado", "confirmado"];

function leerUrl(search, mesActual) {
  const params = new URLSearchParams(search);
  const salon = Number(params.get("salon"));
  return {
    mes: leerMes(params.get("mes")) ?? mesActual,
    salon: Number.isInteger(salon) && salon > 0 ? salon : "todos",
  };
}

function armarUrl(mes, salon, mesActual) {
  const params = new URLSearchParams();
  if (mes !== mesActual) params.set("mes", mes);
  if (salon !== "todos") params.set("salon", salon);
  const texto = params.toString();
  return texto ? `?${texto}` : "";
}

export default function Calendario() {
  const hoy = useMemo(() => hoyLocal(), []);
  const mesActual = claveMes(hoy);
  const location = useLocation();
  const navigate = useNavigate();
  const [inicial] = useState(() => leerUrl(location.search, mesActual));

  const [mes, setMes] = useState(inicial.mes); // "AAAA-MM"
  const [seleccion, setSeleccion] = useState(() => fechaISO(diaPorDefecto(inicial.mes, hoy)));
  const [filtroSitio, setFiltroSitio] = useState("todos");
  const [filtroSalon, setFiltroSalon] = useState(inicial.salon);
  // Lo último que llegó del API, con el mes al que corresponde.
  const [datos, setDatos] = useState(null); // { mes, salones, cotizaciones }
  const [cargando, setCargando] = useState(true);
  // Error al cargar: null | "sesion" (401) | "permiso" (403) | "servidor".
  const [errorCarga, setErrorCarga] = useState(null);
  const [sesionVencida, setSesionVencida] = useState(false);
  const [gestionar, setGestionar] = useState(null); // id del salón con el diálogo abierto

  const pedidoRef = useRef(0); // una respuesta vieja no pisa a la nueva
  const urlRef = useRef(location.search); // la última URL leída o escrita aquí
  const salonPorRevisarRef = useRef(true); // ?salon llegó por URL y falta validarlo
  const abridorRef = useRef(null); // botón "Gestionar", para devolverle el foco
  const sesionRef = useRef(null);

  async function cargar(mesPedido) {
    const pedido = ++pedidoRef.current;
    const dias = diasDelMes(mesPedido);
    setCargando(true);
    setErrorCarga(null);
    try {
      const [salones, cotizaciones] = await Promise.all([
        listarSalones(),
        obtenerCalendario({ desde: fechaISO(dias[0]), hasta: fechaISO(dias.at(-1)) }),
      ]);
      if (pedido !== pedidoRef.current) return;
      setDatos({ mes: mesPedido, salones, cotizaciones });
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
    cargar(mes);
  }, [mes]);

  function escribirUrl(nuevoMes, nuevoSalon) {
    const search = armarUrl(nuevoMes, nuevoSalon, mesActual);
    if (search === urlRef.current) return;
    urlRef.current = search;
    navigate({ search }, { replace: true });
  }

  // Navegar a /calendario estando ya aquí (la pestaña, o un enlace con otra URL):
  // se aplica la URL nueva. Las escrituras propias no entran porque urlRef ya la tiene.
  useEffect(() => {
    if (location.search === urlRef.current) return;
    urlRef.current = location.search;
    const url = leerUrl(location.search, mesActual);
    setMes(url.mes);
    setSeleccion(fechaISO(diaPorDefecto(url.mes, hoy)));
    setFiltroSitio("todos");
    setFiltroSalon(url.salon);
    salonPorRevisarRef.current = true;
  }, [location.search]);

  // URL recién leída, con los salones ya cargados: un ?salon que no es de un salón
  // visible se ignora; si lo es, se elige también su sitio. Después la URL queda
  // limpia (sin un ?mes mal formado ni un ?salon ignorado), con una sola escritura.
  useEffect(() => {
    if (!datos || !salonPorRevisarRef.current) return;
    salonPorRevisarRef.current = false;
    const salon = datos.salones.find((s) => s.id === filtroSalon);
    if (salon) setFiltroSitio(salon.sitio);
    else setFiltroSalon("todos");
    escribirUrl(mes, salon ? salon.id : "todos");
  }, [datos, filtroSalon]);

  // El foco vuelve a "Gestionar" en un efecto, cuando el diálogo ya se quitó (ERR-017).
  useEffect(() => {
    if (gestionar === null && abridorRef.current?.isConnected) {
      abridorRef.current.focus();
      abridorRef.current = null;
    }
  }, [gestionar]);

  // Los chips de sitio salen de los salones (sitio_nombre, SGDE-104).
  const sitiosConSalones = useMemo(() => sitiosDeSalones(datos?.salones ?? []), [datos]);
  // Por nombre, en el mismo orden que las píldoras.
  const salonesDelSitio = useMemo(
    () => (datos?.salones ?? [])
      .filter((s) => filtroSitio === "todos" || s.sitio === filtroSitio)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [datos, filtroSitio],
  );
  const salonElegido = salonesDelSitio.some((s) => s.id === filtroSalon) ? filtroSalon : "todos";
  const salonesVisibles = useMemo(
    () => (salonElegido === "todos" ? salonesDelSitio : salonesDelSitio.filter((s) => s.id === salonElegido)),
    [salonesDelSitio, salonElegido],
  );
  const porDia = useMemo(
    () => (datos ? agruparPorDia(datos.cotizaciones, new Set(salonesVisibles.map((s) => s.id))) : {}),
    [datos, salonesVisibles],
  );

  function cambiarMes(nuevo) {
    setMes(nuevo);
    setSeleccion(fechaISO(diaPorDefecto(nuevo, hoy)));
    escribirUrl(nuevo, salonElegido);
  }

  function cambiarSitio(sitio) {
    setFiltroSitio(sitio);
    setFiltroSalon("todos");
    escribirUrl(mes, "todos");
  }

  function cambiarSalon(salon) {
    setFiltroSalon(salon);
    escribirUrl(mes, salon);
  }

  function abrirGestion(salon, boton) {
    abridorRef.current = boton;
    setGestionar(salon.id);
  }

  function alVolverAEntrar() {
    setSesionVencida(false);
    if (errorCarga === "sesion") cargar(mes);
  }

  const listo = datos?.mes === mes && !errorCarga;
  const diaSeleccionado = desdeISO(seleccion);
  const salonGestion = gestionar !== null && datos?.salones.find((s) => s.id === gestionar);

  let contenido;
  if (errorCarga === "sesion") {
    contenido = (
      <Tarjeta>
        <EstadoVacio titulo="Tu sesión expiró" texto="Vuelve a entrar con el aviso de abajo para ver el calendario." />
      </Tarjeta>
    );
  } else if (errorCarga) {
    contenido = (
      <Tarjeta>
        <AvisoError tipo={errorCarga} onReintentar={() => cargar(mes)} />
      </Tarjeta>
    );
  } else if (!listo) {
    contenido = <EsqueletoMes />;
  } else if (datos.salones.length === 0) {
    contenido = (
      <Tarjeta>
        <EstadoVacio
          titulo="Aún no hay salones"
          texto="Crea un salón y habilita sus montajes para ver aquí su disponibilidad."
          accion={<Boton as={Link} to="/salones" variante="oscuro">Ir a Salones</Boton>}
        />
      </Tarjeta>
    );
  } else {
    contenido = (
      <CalendarioMes
        dias={diasDelMes(mes)}
        mes={primerDia(mes)}
        porDia={porDia}
        hoy={hoy}
        seleccion={seleccion}
        onSeleccionar={setSeleccion}
      />
    );
  }

  return (
    <div className="calendario">
      <CabeceraPagina
        antetitulo="Disponibilidad"
        titulo={tituloMes(mes)}
        acciones={
          <FiltrosCalendario
            onMesAnterior={() => cambiarMes(sumarMeses(mes, -1))}
            onMesSiguiente={() => cambiarMes(sumarMeses(mes, 1))}
            onHoy={() => cambiarMes(mesActual)}
            enMesActual={mes === mesActual}
            sitios={sitiosConSalones}
            filtroSitio={filtroSitio}
            onSitio={cambiarSitio}
            salones={salonesDelSitio}
            filtroSalon={salonElegido}
            onSalon={cambiarSalon}
          />
        }
      />
      <p className="visually-hidden" aria-live="polite">{tituloMes(mes)}</p>

      <div className="calendario__cuerpo">
        <section className="calendario__mes" aria-label="Mes" aria-busy={cargando}>
          {contenido}
          {listo && datos.salones.length > 0 && (
            <LeyendaEstados estados={ESTADOS_LEYENDA} className="calendario__leyenda" />
          )}
        </section>

        {listo && datos.salones.length > 0 && (
          <PanelDia dia={diaSeleccionado} salones={salonesVisibles} lista={porDia[seleccion]} onGestionar={abrirGestion} />
        )}
      </div>

      {salonGestion && (
        <DialogoDiaSalon
          salon={salonGestion}
          dia={diaSeleccionado}
          esPasado={seleccion < fechaISO(hoy)}
          cotizaciones={(porDia[seleccion] ?? []).filter((c) => c.salon === salonGestion.id)}
          onCambio={() => cargar(mes)}
          onCerrar={() => setGestionar(null)}
          onSesionVencida={() => setSesionVencida(true)}
          sesionVencida={sesionVencida}
          onEntrarDeNuevo={(boton) => sesionRef.current?.abrir({ focoAlVolver: boton })}
        />
      )}

      <SesionVencida ref={sesionRef} visible={sesionVencida} onReingreso={alVolverAEntrar} />
    </div>
  );
}
