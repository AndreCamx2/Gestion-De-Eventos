import { useState, useEffect, useMemo, useRef } from "react";
import { listarSalones, listarMontajes, listarSalonMontajes } from "../api/salones";
import { listarSitios } from "../api/sitios";
import {
  AvisoError,
  Boton,
  CabeceraPagina,
  Esqueleto,
  EstadoVacio,
  TablaContenedor,
  Tarjeta,
} from "../components/ui";
import SesionVencida from "../components/SesionVencida";
import NuevoSalonModal from "./NuevoSalonModal";
import HabilitarMontajeModal from "./HabilitarMontajeModal";
import "../styles/catalogo-salones.css";

// Minúsculas y sin tildes: así "bolivar" encuentra a "Bolívar".
function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const formatoNumero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

// "20.00" → "20 m"; "4.50" → "4,5 m". Sin dato → "—" (nunca un número inventado).
function metros(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  return `${formatoNumero.format(Number(valor))} m`;
}

function aforoMaximo(habilitados) {
  return habilitados.length ? Math.max(...habilitados.map((h) => h.aforo)) : null;
}

export default function Salones() {
  const [salones, setSalones] = useState([]);
  const [montajes, setMontajes] = useState([]);
  const [salonMontajes, setSalonMontajes] = useState([]);
  const [sitios, setSitios] = useState([]);
  const [cargando, setCargando] = useState(true);
  // Error al cargar: null | "permiso" (403) | "servidor" (500 o sin red) | "sesion" (401).
  const [errorCarga, setErrorCarga] = useState(null);
  const [sesionVencida, setSesionVencida] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  // "" = todos; si no, el id del montaje (como texto, igual que el <select>).
  const [filtroMontaje, setFiltroMontaje] = useState("");
  const [aforoMinimo, setAforoMinimo] = useState("");

  // Diálogo abierto: null | { tipo: "salon" } | { tipo: "montaje", salonId }.
  const [dialogo, setDialogo] = useState(null);
  const [aviso, setAviso] = useState(null);

  const buscarRef = useRef(null);
  const nuevoSalonRef = useRef(null);
  // Botón que abrió el diálogo: recibe el foco de vuelta al cerrarlo.
  const disparadorRef = useRef(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  // Al cerrar un diálogo el foco vuelve a quien lo abrió. Si ese botón ya no
  // existe (p. ej. el "Nuevo salón" del estado vacío), va al de la cabecera.
  useEffect(() => {
    if (dialogo !== null) return;
    const disparador = disparadorRef.current;
    if (!disparador) return;
    disparadorRef.current = null;
    (disparador.isConnected ? disparador : nuevoSalonRef.current)?.focus();
  }, [dialogo]);

  async function cargarDatos() {
    setCargando(true);
    setErrorCarga(null);
    try {
      const [salonesData, montajesData, salonMontajesData, sitiosData] = await Promise.all([
        listarSalones(),
        listarMontajes(),
        listarSalonMontajes(),
        listarSitios(),
      ]);
      setSalones(salonesData);
      setMontajes(montajesData);
      setSalonMontajes(salonMontajesData);
      setSitios(sitiosData);
    } catch (err) {
      if (err.status === 401) {
        setErrorCarga("sesion");
        setSesionVencida(true);
      } else if (err.status === 403) {
        setErrorCarga("permiso");
      } else {
        setErrorCarga("servidor");
      }
    } finally {
      setCargando(false);
    }
  }

  // Montajes habilitados de cada salón, en el orden del catálogo:
  // Map(salonId → [{ id, montajeId, nombre, aforo }]).
  const habilitadosPorSalon = useMemo(() => {
    const orden = new Map(montajes.map((m, i) => [m.id, i]));
    const nombres = new Map(montajes.map((m) => [m.id, m.nombre]));
    const mapa = new Map();
    salonMontajes.forEach((sm) => {
      const lista = mapa.get(sm.salon) ?? [];
      lista.push({ id: sm.id, montajeId: sm.montaje, nombre: nombres.get(sm.montaje) ?? "Montaje", aforo: sm.aforo });
      mapa.set(sm.salon, lista);
    });
    mapa.forEach((lista) => lista.sort((a, b) => (orden.get(a.montajeId) ?? 0) - (orden.get(b.montajeId) ?? 0)));
    return mapa;
  }, [montajes, salonMontajes]);

  const nombreSitio = useMemo(() => new Map(sitios.map((s) => [s.id, s.nombre])), [sitios]);
  const variosSitios = new Set(salones.map((s) => s.sitio)).size > 1;

  function habilitadosDe(salonId) {
    return habilitadosPorSalon.get(salonId) ?? [];
  }

  // Filtros en el navegador. "Aforo mínimo" se calcula con los montajes: el salón
  // pasa si alguno alcanza ese aforo; con un montaje elegido, cuenta solo ese.
  const salonesFiltrados = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    const minimo = Number(aforoMinimo) || 0;
    return salones.filter((s) => {
      if (texto && !normalizar(s.nombre).includes(texto)) return false;
      const habilitados = habilitadosPorSalon.get(s.id) ?? [];
      const candidatos = filtroMontaje
        ? habilitados.filter((h) => h.montajeId === Number(filtroMontaje))
        : habilitados;
      if (filtroMontaje && candidatos.length === 0) return false;
      if (minimo > 0 && !candidatos.some((h) => h.aforo >= minimo)) return false;
      return true;
    });
  }, [salones, habilitadosPorSalon, busqueda, filtroMontaje, aforoMinimo]);

  const hayFiltros = busqueda.trim() !== "" || filtroMontaje !== "" || Number(aforoMinimo) > 0;
  const datosListos = !cargando && !errorCarga;

  function abrirDialogo(nuevo, evento) {
    disparadorRef.current = evento?.currentTarget ?? document.activeElement;
    setAviso(null);
    setDialogo(nuevo);
  }

  function cerrarDialogo() {
    setDialogo(null);
  }

  function alCrearSalon(salon) {
    setSalones((prev) => [...prev, salon]);
    setDialogo(null);
    setAviso(`Salón «${salon.nombre}» creado. Ahora habilita sus montajes con su aforo.`);
  }

  function alHabilitarMontaje(salonMontaje) {
    setSalonMontajes((prev) => [...prev, salonMontaje]);
    setDialogo(null);
    const salon = salones.find((s) => s.id === salonMontaje.salon);
    const montaje = montajes.find((m) => m.id === salonMontaje.montaje);
    setAviso(
      `${montaje?.nombre ?? "Montaje"} habilitado en «${salon?.nombre ?? "el salón"}» con aforo de ${formatoNumero.format(salonMontaje.aforo)}.`,
    );
  }

  function quitarFiltros() {
    setBusqueda("");
    setFiltroMontaje("");
    setAforoMinimo("");
    // El botón "Quitar filtros" desaparece: el foco pasa a la búsqueda.
    buscarRef.current?.focus();
  }

  function alVolverAEntrar() {
    setSesionVencida(false);
    // Si la sesión venció al cargar, los datos nunca llegaron: se piden otra vez.
    if (errorCarga === "sesion") cargarDatos();
  }

  function etiquetaSalon(s) {
    return variosSitios ? `${s.nombre} · ${nombreSitio.get(s.sitio) ?? "Sitio"}` : s.nombre;
  }

  let vista = "lista";
  if (errorCarga === "permiso" || errorCarga === "servidor") vista = "error";
  else if (errorCarga === "sesion") vista = "sesion";
  else if (cargando) vista = "carga";
  else if (salones.length === 0) vista = "vacio";
  else if (salonesFiltrados.length === 0) vista = "sinCoincidencias";

  return (
    <div className="salones-pv">
      <CabeceraPagina
        antetitulo="Catálogo"
        titulo="Salones y montajes"
        subtitulo="Cuánta gente cabe, en qué formato y dónde."
        acciones={
          <Boton
            ref={nuevoSalonRef}
            variante="principal"
            disabled={!datosListos}
            onClick={(e) => abrirDialogo({ tipo: "salon" }, e)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo salón
          </Boton>
        }
      />

      {datosListos && salones.length > 0 && (
        <div className="salones-filtros">
          <div className="salones-filtro salones-filtro--buscar">
            <label className="salones-filtro__etiqueta" htmlFor="salones-buscar">Buscar</label>
            <div className="salones-buscar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                ref={buscarRef}
                id="salones-buscar"
                type="search"
                className="salones-buscar__input"
                placeholder="Nombre del salón"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>

          <div className="salones-filtro">
            <label className="salones-filtro__etiqueta" htmlFor="salones-filtro-montaje">Montaje</label>
            <select
              id="salones-filtro-montaje"
              className="salones-filtro__control"
              value={filtroMontaje}
              onChange={(e) => setFiltroMontaje(e.target.value)}
            >
              <option value="">Todos</option>
              {montajes.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>

          <div className="salones-filtro salones-filtro--aforo">
            <label className="salones-filtro__etiqueta" htmlFor="salones-filtro-aforo">Aforo mínimo</label>
            <input
              id="salones-filtro-aforo"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              className="salones-filtro__control"
              placeholder="Personas"
              value={aforoMinimo}
              onChange={(e) => setAforoMinimo(e.target.value)}
            />
          </div>

          <p className="salones-filtros__conteo" role="status">
            {hayFiltros ? `${salonesFiltrados.length} de ${salones.length} salones` : ""}
          </p>
        </div>
      )}

      {/* Siempre presente (aunque vacío) para que el lector de pantalla anuncie el aviso. */}
      <p className="salones-aviso" role="status">{aviso}</p>

      {vista === "error" && (
        <Tarjeta>
          <AvisoError tipo={errorCarga} onReintentar={cargarDatos} />
        </Tarjeta>
      )}

      {vista === "sesion" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Tu sesión expiró"
            texto="Vuelve a entrar con el aviso de abajo para ver los salones."
          />
        </Tarjeta>
      )}

      {vista === "carga" && (
        <Tarjeta>
          <Esqueleto filas={3} avatar={false} columnas={3} etiqueta="Cargando salones…" />
        </Tarjeta>
      )}

      {vista === "vacio" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Aún no hay salones"
            texto="Crea el primero con sus medidas. Después habilitas sus montajes con el aforo de cada uno."
            accion={
              <Boton variante="secundario" onClick={(e) => abrirDialogo({ tipo: "salon" }, e)}>
                Nuevo salón
              </Boton>
            }
          />
        </Tarjeta>
      )}

      {vista === "sinCoincidencias" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Ningún salón coincide"
            texto="Prueba con otro nombre, otro montaje o un aforo menor."
            accion={
              <Boton variante="secundario" onClick={quitarFiltros}>
                Quitar filtros
              </Boton>
            }
          />
        </Tarjeta>
      )}

      {vista === "lista" && (
        <>
          <section className="salones-grilla" aria-label="Salones">
            {salonesFiltrados.map((s) => (
              <TarjetaSalon
                key={s.id}
                salon={s}
                sitio={nombreSitio.get(s.sitio)}
                habilitados={habilitadosDe(s.id)}
                puedeHabilitar={habilitadosDe(s.id).length < montajes.length}
                onHabilitar={(e) => abrirDialogo({ tipo: "montaje", salonId: s.id }, e)}
              />
            ))}
          </section>

          <Tarjeta as="section" className="salones-aforo" aria-labelledby="salones-aforo-titulo">
            <div className="salones-aforo__cabecera">
              <div>
                <h2 id="salones-aforo-titulo" className="salones-aforo__titulo">Aforo por montaje</h2>
                <p className="salones-aforo__nota">Un guion significa que ese montaje no está habilitado en el salón.</p>
              </div>
              <Boton
                variante="secundario"
                disabled={montajes.length === 0}
                onClick={(e) => abrirDialogo({ tipo: "montaje", salonId: null }, e)}
              >
                Habilitar montaje
              </Boton>
            </div>

            <TablaContenedor etiqueta="Aforo por montaje de cada salón" className="salones-aforo__caja">
              <table className="salones-aforo__tabla">
                <thead>
                  <tr>
                    <th scope="col">Salón</th>
                    {montajes.map((m) => (
                      <th key={m.id} scope="col">{m.nombre}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {salonesFiltrados.map((s) => {
                    const habilitados = habilitadosDe(s.id);
                    const maximo = aforoMaximo(habilitados);
                    return (
                      <tr key={s.id}>
                        <th scope="row">{etiquetaSalon(s)}</th>
                        {montajes.map((m) => {
                          const h = habilitados.find((x) => x.montajeId === m.id);
                          if (!h) {
                            return (
                              <td key={m.id} className="salones-aforo__celda salones-aforo__celda--vacia">
                                <span aria-hidden="true">—</span>
                                <span className="visually-hidden">No habilitado</span>
                              </td>
                            );
                          }
                          const esMaximo = h.aforo === maximo;
                          return (
                            <td
                              key={m.id}
                              className={`salones-aforo__celda ${esMaximo ? "salones-aforo__celda--maximo" : ""}`}
                            >
                              {formatoNumero.format(h.aforo)}
                              {esMaximo && <span className="visually-hidden"> (máximo del salón)</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TablaContenedor>
          </Tarjeta>
        </>
      )}

      {dialogo?.tipo === "salon" && (
        <NuevoSalonModal
          sitios={sitios}
          onCreado={alCrearSalon}
          onCerrar={cerrarDialogo}
          onSesionVencida={() => setSesionVencida(true)}
        />
      )}

      {dialogo?.tipo === "montaje" && (
        <HabilitarMontajeModal
          salones={salones}
          montajes={montajes}
          habilitados={(salonId) => new Set(habilitadosDe(salonId).map((h) => h.montajeId))}
          etiquetaSalon={etiquetaSalon}
          salonInicial={dialogo.salonId}
          onHabilitado={alHabilitarMontaje}
          onCerrar={cerrarDialogo}
          onSesionVencida={() => setSesionVencida(true)}
        />
      )}

      <SesionVencida visible={sesionVencida} onReingreso={alVolverAEntrar} />
    </div>
  );
}

// Tarjeta de un salón (maqueta Salones): foto o marcador, medidas, aforo máximo
// y sus montajes. "Editar" y "Ver disponibilidad" no están: aún no hay API
// para editar ni pantalla de calendario (pendientes de SGDE-79).
function TarjetaSalon({ salon, sitio, habilitados, puedeHabilitar, onHabilitar }) {
  // Si la URL de la foto no carga, se muestra el marcador en su lugar.
  const [fotoFallo, setFotoFallo] = useState(false);
  const conFoto = Boolean(salon.foto_url) && !fotoFallo;
  const maximo = aforoMaximo(habilitados);
  const idTitulo = `salon-${salon.id}-titulo`;
  // Tres tonos de tokens.css que se alternan para distinguir los marcadores.
  const tono = salon.id % 3;

  return (
    <article className="salon-tarjeta" aria-labelledby={idTitulo}>
      <div className={`salon-tarjeta__foto ${conFoto ? "" : `salon-tarjeta__foto--tono-${tono}`}`}>
        {conFoto && (
          <img
            className="salon-tarjeta__imagen"
            src={salon.foto_url}
            alt={`Foto del salón ${salon.nombre}`}
            loading="lazy"
            onError={() => setFotoFallo(true)}
          />
        )}
        {sitio && <span className="salon-tarjeta__sitio">{sitio}</span>}
        {!conFoto && (
          <h2 id={idTitulo} className="salon-tarjeta__nombre-grande">{salon.nombre}</h2>
        )}
      </div>

      <div className="salon-tarjeta__cuerpo">
        {conFoto && (
          <h2 id={idTitulo} className="salon-tarjeta__nombre">{salon.nombre}</h2>
        )}

        <ul className="salon-tarjeta__datos">
          <li><strong>{metros(salon.ancho)}</strong> de ancho</li>
          <li><strong>{metros(salon.altura)}</strong> de altura</li>
          <li><strong>{maximo === null ? "—" : formatoNumero.format(maximo)}</strong> máx.</li>
        </ul>

        {habilitados.length > 0 ? (
          <ul className="salon-tarjeta__montajes" aria-label={`Montajes de ${salon.nombre}`}>
            {habilitados.map((h) => (
              <li key={h.id} className="salon-tarjeta__montaje">
                {h.nombre}
                <strong>{formatoNumero.format(h.aforo)}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="salon-tarjeta__sin-montajes">Sin montajes habilitados.</p>
        )}

        {puedeHabilitar && (
          <Boton
            variante="secundario"
            className="salon-tarjeta__accion"
            aria-label={`Habilitar montaje en ${salon.nombre}`}
            onClick={onHabilitar}
          >
            Habilitar montaje
          </Boton>
        )}
      </div>
    </article>
  );
}
