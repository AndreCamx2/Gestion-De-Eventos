import { useState, useMemo, useEffect } from "react";
import { getCotizaciones } from "../api/cotizaciones";
import "../styles/cotizaciones.css";

const ESTADOS = ["Todos", "Pendiente", "Aprobada", "Rechazada", "Vencida"];
const TIPOS_CLIENTE = ["Todos", "Persona", "Empresa"];
const RANGOS_FECHA = ["Este mes", "Últimos 3 meses", "Este año"];

function formatCOP(value) {
  return Number(value || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function EstadoBadge({ estado }) {
  const claseEstado = `badge badge--${(estado || "").toLowerCase()}`;
  return <span className={claseEstado}>{estado}</span>;
}

export default function Cotizaciones() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroFecha, setFiltroFecha] = useState(RANGOS_FECHA[0]);
  const [paginaActual, setPaginaActual] = useState(1);

  useEffect(() => {
    setLoading(true);
    
    getCotizaciones({
      estado: filtroEstado,
      tipo: filtroTipo,
      rangoFecha: filtroFecha,
      page: paginaActual,
    })
      .then((data) => {
        const listaCotizaciones = Array.isArray(data) ? data : data.results || [];
        setCotizaciones(listaCotizaciones);
        setError(null);
      })
      .catch((err) => {
        console.error("Error al cargar cotizaciones:", err);
        setError(err.message || "No se pudieron obtener las cotizaciones del servidor.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [filtroEstado, filtroTipo, filtroFecha, paginaActual]);

  const resumen = useMemo(() => {
    const pendientes = cotizaciones.filter((c) => c.estado === "Pendiente" || c.estado === "pendiente").length;
    const aprobadas = cotizaciones.filter((c) => c.estado === "Aprobada" || c.estado === "aprobada").length;
    const valorTotal = cotizaciones.reduce((sum, c) => sum + Number(c.monto || c.total || 0), 0);
    return { total: cotizaciones.length, pendientes, aprobadas, valorTotal };
  }, [cotizaciones]);

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
            <select value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPaginaActual(1); }}>
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
          </label>

          <label className="filter">
            <span>Tipo de cliente:</span>
            <select value={filtroTipo} onChange={(e) => { setFiltroTipo(e.target.value); setPaginaActual(1); }}>
              {TIPOS_CLIENTE.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </label>

          <label className="filter">
            <span>Fecha:</span>
            <select value={filtroFecha} onChange={(e) => { setFiltroFecha(e.target.value); setPaginaActual(1); }}>
              {RANGOS_FECHA.map((rango) => (
                <option key={rango} value={rango}>{rango}</option>
              ))}
            </select>
          </label>
        </div>

        <button type="button" className="btn btn--primary">+ Nueva cotización</button>
      </div>

      {/* Tabla de Cotizaciones */}
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
            {loading ? (
              <tr>
                <td colSpan={7} className="table-empty">Cargando cotizaciones desde la API…</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="table-empty" style={{ color: "#d9534f" }}>{error}</td>
              </tr>
            ) : cotizaciones.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-empty">No hay cotizaciones registradas con estos filtros.</td>
              </tr>
            ) : (
              cotizaciones.map((c) => (
                <tr key={c.id}>
                  <td className="cell-strong">{c.id}</td>
                  <td>{c.cliente || c.nombre_cliente}</td>
                  <td><span className="pill">{c.tipo || c.tipo_cliente}</span></td>
                  <td>{c.salon || c.nombre_salon}</td>
                  <td>{c.fecha || c.fecha_evento}</td>
                  <td><EstadoBadge estado={c.estado} /></td>
                  <td>{formatCOP(c.monto || c.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <p className="pagination__info">
          Mostrando página {paginaActual}
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