import { useState, useMemo } from "react";
import "../styles/cotizaciones.css";

// (algo como GET /api/cotizaciones) cuando el backend esté listo se colocarán los datos reales por medio de la API.
const COTIZACIONES_MOCK = [
  { id: "#COT-2041", cliente: "Mateo Gómez Villalobos", tipo: "Persona", salon: "Salón Esmeralda", fecha: "Oct 12, 2026", estado: "Aprobada", monto: 4250000 },
  { id: "#COT-2040", cliente: "Inversiones Bolívar S.A.S.", tipo: "Empresa", salon: "Terraza del Mar", fecha: "Oct 18, 2026", estado: "Pendiente", monto: 12800000 },
  { id: "#COT-2039", cliente: "Valeria Sofía Mendoza", tipo: "Persona", salon: "Salón Colonial", fecha: "Nov 02, 2026", estado: "Aprobada", monto: 3100000 },
  { id: "#COT-2038", cliente: "Constructora del Caribe", tipo: "Empresa", salon: "Salón Imperial", fecha: "Nov 15, 2026", estado: "Rechazada", monto: 8500000 },
  { id: "#COT-2037", cliente: "Andrés Felipe Restrepo", tipo: "Persona", salon: "Jardín Naranjos", fecha: "Dec 05, 2026", estado: "Pendiente", monto: 2900000 },
  { id: "#COT-2036", cliente: "Tecnología Cartagena", tipo: "Empresa", salon: "Auditorio Principal", fecha: "Sep 28, 2026", estado: "Vencida", monto: 15000000 },
  { id: "#COT-2035", cliente: "Camila Reyes Osorio", tipo: "Persona", salon: "Salón Imperial", fecha: "Oct 05, 2026", estado: "Aprobada", monto: 6400000 },
];

const ESTADOS = ["Todos", "Pendiente", "Aprobada", "Rechazada", "Vencida"];
const TIPOS_CLIENTE = ["Todos", "Persona", "Empresa"];
const RANGOS_FECHA = ["Este mes", "Últimos 3 meses", "Este año"];

function formatCOP(value) {
  return value.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

function EstadoBadge({ estado }) {
  // Cada estado tiene su propia clase de color, definida en cotizaciones.css
  const claseEstado = `badge badge--${estado.toLowerCase()}`;
  return <span className={claseEstado}>{estado}</span>;
}

export default function Cotizaciones() {
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroFecha, setFiltroFecha] = useState(RANGOS_FECHA[0]);
  const [paginaActual, setPaginaActual] = useState(1);

  // Filtrado en el frontend, solo para esta demo con datos de ejemplo.
  // Cuando se conecte el backend, lo normal es mandar estos filtros como
  // query params (?estado=Pendiente&tipo=Empresa) y que el backend
  // devuelva ya la página filtrada, en vez de filtrar aquí.
  const cotizacionesFiltradas = useMemo(() => {
    return COTIZACIONES_MOCK.filter((c) => {
      const coincideEstado = filtroEstado === "Todos" || c.estado === filtroEstado;
      const coincideTipo = filtroTipo === "Todos" || c.tipo === filtroTipo;
      return coincideEstado && coincideTipo;
    });
  }, [filtroEstado, filtroTipo]);

  const resumen = useMemo(() => {
    const pendientes = COTIZACIONES_MOCK.filter((c) => c.estado === "Pendiente").length;
    const aprobadas = COTIZACIONES_MOCK.filter((c) => c.estado === "Aprobada").length;
    const valorTotal = COTIZACIONES_MOCK.reduce((sum, c) => sum + c.monto, 0);
    return { total: COTIZACIONES_MOCK.length, pendientes, aprobadas, valorTotal };
  }, []);

  return (
    <div className="cotizaciones">
      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-card__label">Total cotizaciones</p>
          <p className="stat-card__value">{resumen.total}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Pendientes</p>
          <p className="stat-card__value stat-card__value--amber">{resumen.pendientes}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Aprobadas</p>
          <p className="stat-card__value stat-card__value--green">{resumen.aprobadas}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Valor total</p>
          <p className="stat-card__value stat-card__value--gold">
            {formatCOP(resumen.valorTotal).replace("COP", "").trim()} COP
          </p>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar__filters">
          <label className="filter">
            <span>Estado:</span>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
          </label>

          <label className="filter">
            <span>Tipo de cliente:</span>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              {TIPOS_CLIENTE.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </label>

          <label className="filter">
            <span>Fecha:</span>
            <select value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)}>
              {RANGOS_FECHA.map((rango) => (
                <option key={rango} value={rango}>{rango}</option>
              ))}
            </select>
          </label>
        </div>

        <button type="button" className="btn btn--primary">+ Nueva cotización</button>
      </div>

      <div className="table-wrap">
        <table className="cotizaciones-table">
          <thead>
            <tr>
              <th>N° cotización</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Salón</th>
              <th>Fecha evento</th>
              <th>Estado</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            {cotizacionesFiltradas.map((c) => (
              <tr key={c.id}>
                <td className="cell-strong">{c.id}</td>
                <td>{c.cliente}</td>
                <td><span className="pill">{c.tipo}</span></td>
                <td>{c.salon}</td>
                <td>{c.fecha}</td>
                <td><EstadoBadge estado={c.estado} /></td>
                <td>{formatCOP(c.monto)}</td>
              </tr>
            ))}
            {cotizacionesFiltradas.length === 0 && (
              <tr>
                <td colSpan={7} className="table-empty">No hay cotizaciones con estos filtros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <p className="pagination__info">
          Mostrando 1 a {cotizacionesFiltradas.length} de {resumen.total} resultados
        </p>
        <div className="pagination__controls">
          <button type="button" disabled={paginaActual === 1} onClick={() => setPaginaActual((p) => p - 1)}>
            Anterior
          </button>
          {[1, 2, 3].map((page) => (
            <button
              key={page}
              type="button"
              className={page === paginaActual ? "is-active" : ""}
              onClick={() => setPaginaActual(page)}
            >
              {page}
            </button>
          ))}
          <button type="button" onClick={() => setPaginaActual((p) => p + 1)}>Siguiente</button>
        </div>
      </div>
    </div>
  );
}
