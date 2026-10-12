import { useState, useEffect, useMemo, useCallback } from "react";
import { getCotizaciones } from "../api/cotizaciones";
import {
  AvisoError,
  Boton,
  CabeceraPagina,
  Esqueleto,
  EstadoBadge,
  EstadoVacio,
  TablaContenedor,
  Tarjeta,
} from "../components/ui";
import SesionVencida from "../components/SesionVencida";
import "../styles/cotizaciones.css";

const FILTROS = [
  { clave: "todas", texto: "Todas" },
  { clave: "cotizado", texto: "Cotizadas" },
  { clave: "vencida", texto: "Vencidas" },
  { clave: "bloqueado", texto: "Bloqueadas" },
  { clave: "confirmado", texto: "Confirmadas" },
  { clave: "cancelado", texto: "Canceladas" },
];

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIA_MS = 86400000;
const formatoPesos = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const formatoMillones = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

function aFecha(texto) {
  const [anio, mes, dia] = texto.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

function hoy() {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

function diasHasta(texto) {
  return Math.round((aFecha(texto) - hoy()) / DIA_MS);
}

function fechaCorta(texto, conAnio = true) {
  const f = aFecha(texto);
  return `${f.getDate()} ${MESES[f.getMonth()]}${conAnio ? ` ${f.getFullYear()}` : ""}`;
}

function pesos(valor) {
  return `$ ${formatoPesos.format(Math.round(valor))}`;
}

function millones(valor) {
  return `$ ${formatoMillones.format(valor / 1e6)} M`;
}

function numeroCotizacion(id) {
  return `#${String(id).padStart(3, "0")}`;
}

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function estadoVisible(c) {
  return c.vencida ? "vencida" : c.estado;
}

function vigencia(c) {
  if ((c.estado !== "cotizado" && c.estado !== "bloqueado") || !c.validez_oferta) {
    return { fecha: "—", nota: "", tono: "neutro" };
  }
  const dias = diasHasta(c.validez_oferta);
  const fecha = fechaCorta(c.validez_oferta, false);
  if (c.vencida || dias < 0) {
    const pasados = Math.max(1, -dias);
    return { fecha, nota: `venció hace ${pasados} ${pasados === 1 ? "día" : "días"}`, tono: "vencida" };
  }
  if (dias === 0) return { fecha, nota: "vence hoy", tono: "pronto" };
  return {
    fecha,
    nota: `vence en ${dias} ${dias === 1 ? "día" : "días"}`,
    tono: dias <= 7 ? "pronto" : "neutro",
  };
}

export default function Cotizaciones() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [sesionVencida, setSesionVencida] = useState(false);

  const [filtro, setFiltro] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const data = await getCotizaciones({ desde, hasta });
      setCotizaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.status === 401) {
        setErrorCarga("sesion");
        setSesionVencida(true);
      } else if (err.status === 403) {
        setErrorCarga("permiso");
      } else if (err.status === 400) {
        setErrorCarga("fechas");
      } else {
        setErrorCarga("servidor");
      }
    } finally {
      setCargando(false);
    }
  }, [desde, hasta]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  function alVolverAEntrar() {
    setSesionVencida(false);
    if (errorCarga === "sesion") cargarDatos();
  }

  const cifras = useMemo(() => {
    const vigentes = cotizaciones.filter(
      (c) => (c.estado === "cotizado" && !c.vencida) || c.estado === "bloqueado"
    );
    const noCanceladas = cotizaciones.filter((c) => c.estado !== "cancelado");
    const totalNoCanceladas = noCanceladas.reduce((suma, c) => suma + Number(c.total || 0), 0);
    return {
      valorVigente: vigentes.reduce((suma, c) => suma + Number(c.total || 0), 0),
      confirmadas: cotizaciones.filter((c) => c.estado === "confirmado").length,
      ticketPromedio: noCanceladas.length ? totalNoCanceladas / noCanceladas.length : 0,
      vencenPronto: cotizaciones.filter(
        (c) => c.estado === "cotizado" && !c.vencida && c.validez_oferta && diasHasta(c.validez_oferta) <= 7
      ).length,
    };
  }, [cotizaciones]);

  const conteos = useMemo(() => {
    const mapa = { todas: cotizaciones.length };
    cotizaciones.forEach((c) => {
      const clave = estadoVisible(c);
      mapa[clave] = (mapa[clave] ?? 0) + 1;
    });
    return mapa;
  }, [cotizaciones]);

  const filtradas = useMemo(() => {
    const texto = normalizar(busqueda.trim()).replace(/^#/, "");
    return cotizaciones.filter((c) => {
      if (filtro !== "todas" && estadoVisible(c) !== filtro) return false;
      if (!texto) return true;
      return normalizar(c.cliente_nombre).includes(texto) || String(c.id).padStart(3, "0").includes(texto);
    });
  }, [cotizaciones, filtro, busqueda]);

  const hayFiltros = filtro !== "todas" || busqueda.trim() !== "" || desde !== "" || hasta !== "";

  function quitarFiltros() {
    setFiltro("todas");
    setBusqueda("");
    setDesde("");
    setHasta("");
  }

  let vista = "lista";
  if (errorCarga === "permiso" || errorCarga === "servidor") vista = "error";
  else if (errorCarga === "fechas") vista = "fechas";
  else if (errorCarga === "sesion") vista = "sesion";
  else if (cargando) vista = "carga";
  else if (cotizaciones.length === 0 && !desde && !hasta) vista = "vacio";
  else if (filtradas.length === 0) vista = "sinCoincidencias";

  const sinCifras = vista === "error" || vista === "sesion" || vista === "carga" || vista === "fechas";

  return (
    <div className="cotizaciones-pv">
      <CabeceraPagina
        antetitulo="Operación"
        titulo="Cotizaciones"
        subtitulo="Todo lo que se ha ofrecido, en qué estado está y cuánto vale."
        acciones={
          <Boton disabled title="Disponible cuando esté la pantalla de nueva cotización">
            <span aria-hidden="true">+</span> Nueva cotización
          </Boton>
        }
      />

      <section className="cotizaciones-cifras" aria-label="Resumen de cotizaciones">
        <div className="cotizaciones-cifra">
          <p className="cotizaciones-cifra__etiqueta">Valor vigente</p>
          <p className="cotizaciones-cifra__valor">{sinCifras ? "—" : millones(cifras.valorVigente)}</p>
          <p className="cotizaciones-cifra__nota">Cotizadas al día y bloqueadas</p>
        </div>
        <div className="cotizaciones-cifra">
          <p className="cotizaciones-cifra__etiqueta">Confirmadas</p>
          <p className="cotizaciones-cifra__valor cotizaciones-cifra__valor--verde">
            {sinCifras ? "—" : cifras.confirmadas}
          </p>
          <p className="cotizaciones-cifra__nota">Eventos con garantía</p>
        </div>
        <div className="cotizaciones-cifra">
          <p className="cotizaciones-cifra__etiqueta">Ticket promedio</p>
          <p className="cotizaciones-cifra__valor">{sinCifras ? "—" : millones(cifras.ticketPromedio)}</p>
          <p className="cotizaciones-cifra__nota">Sin contar canceladas</p>
        </div>
        <div className="cotizaciones-cifra">
          <p className="cotizaciones-cifra__etiqueta">Vencen en 7 días</p>
          <p className="cotizaciones-cifra__valor cotizaciones-cifra__valor--amarillo">
            {sinCifras ? "—" : cifras.vencenPronto}
          </p>
          <p className="cotizaciones-cifra__nota">Cotizadas aún vigentes</p>
        </div>
      </section>

      <div className="cotizaciones-filtros">
        <div className="cotizaciones-estados" role="group" aria-label="Filtrar por estado">
          {FILTROS.map(({ clave, texto }) => (
            <button
              key={clave}
              type="button"
              className="cotizaciones-estado"
              aria-pressed={filtro === clave}
              onClick={() => setFiltro(clave)}
            >
              {texto}
              {!sinCifras && <span className="cotizaciones-estado__conteo">{conteos[clave] ?? 0}</span>}
            </button>
          ))}
        </div>

        <div className="cotizaciones-campos">
          <label className="cotizaciones-buscar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="visually-hidden">Buscar por cliente o número</span>
            <input
              type="search"
              className="cotizaciones-buscar__input"
              placeholder="Cliente o número"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>

          <label className="cotizaciones-fecha">
            <span className="cotizaciones-fecha__etiqueta">Evento desde</span>
            <input
              type="date"
              className="cotizaciones-fecha__input"
              value={desde}
              max={hasta || undefined}
              onChange={(e) => setDesde(e.target.value)}
            />
          </label>

          <label className="cotizaciones-fecha">
            <span className="cotizaciones-fecha__etiqueta">hasta</span>
            <input
              type="date"
              className="cotizaciones-fecha__input"
              value={hasta}
              min={desde || undefined}
              onChange={(e) => setHasta(e.target.value)}
            />
          </label>
        </div>
      </div>

      {vista === "error" && (
        <Tarjeta>
          <AvisoError tipo={errorCarga} onReintentar={cargarDatos} />
        </Tarjeta>
      )}

      {vista === "fechas" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Revisa las fechas del evento"
            texto="Una de las fechas no es válida. Corrígela o quita el filtro de fechas."
            accion={<Boton variante="secundario" onClick={quitarFiltros}>Quitar filtros</Boton>}
          />
        </Tarjeta>
      )}

      {vista === "sesion" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Tu sesión expiró"
            texto="Vuelve a entrar con el aviso de abajo para ver las cotizaciones."
          />
        </Tarjeta>
      )}

      {vista === "carga" && (
        <Tarjeta>
          <Esqueleto filas={5} avatar={false} columnas={3} etiqueta="Cargando cotizaciones…" />
        </Tarjeta>
      )}

      {vista === "vacio" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Aún no hay cotizaciones"
            texto="Cuando se arme la primera cotización aparecerá aquí con su vigencia y su estado."
          />
        </Tarjeta>
      )}

      {vista === "sinCoincidencias" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Ninguna cotización coincide"
            texto="Prueba con otro estado, otro cliente o un rango de fechas más amplio."
            accion={hayFiltros && <Boton variante="secundario" onClick={quitarFiltros}>Quitar filtros</Boton>}
          />
        </Tarjeta>
      )}

      {vista === "lista" && (
        <TablaContenedor etiqueta="Listado de cotizaciones">
          <table className="cotizaciones-tabla">
            <thead>
              <tr>
                <th scope="col">N.º</th>
                <th scope="col">Cliente</th>
                <th scope="col">Salón</th>
                <th scope="col">Evento</th>
                <th scope="col" className="cotizaciones-tabla__num">Personas</th>
                <th scope="col">Vigencia</th>
                <th scope="col" className="cotizaciones-tabla__num">Total</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c) => {
                const v = vigencia(c);
                return (
                  <tr key={c.id}>
                    <td className="cotizaciones-tabla__numero">{numeroCotizacion(c.id)}</td>
                    <td className="cotizaciones-tabla__cliente">{c.cliente_nombre}</td>
                    <td className="cotizaciones-tabla__suave">{c.salon_nombre}</td>
                    <td>{fechaCorta(c.fecha_evento)}</td>
                    <td className="cotizaciones-tabla__num">{c.cantidad_personas}</td>
                    <td>
                      {v.fecha}
                      {v.nota && (
                        <span className={`cotizaciones-vigencia cotizaciones-vigencia--${v.tono}`}>{v.nota}</span>
                      )}
                    </td>
                    <td className="cotizaciones-tabla__num cotizaciones-tabla__total">{pesos(Number(c.total || 0))}</td>
                    <td><EstadoBadge estado={estadoVisible(c)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="cotizaciones-pie" role="status">
            Mostrando {filtradas.length} de {cotizaciones.length}
          </p>
        </TablaContenedor>
      )}

      <SesionVencida visible={sesionVencida} onReingreso={alVolverAEntrar} />
    </div>
  );
}
