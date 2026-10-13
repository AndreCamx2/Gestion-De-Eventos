import { useState, useEffect } from "react";
import { getRackDisponibilidad } from "../api/rack";
import "../styles/salones.css";

const ESTADOS_MAP = {
  disponible: {
    label: "Disponible",
    colorClass: "badge--disponible",
    colorHex: "#2e7d32",
  },
  cotizado: {
    label: "Cotizado / Bloqueado",
    colorClass: "badge--reservado",
    colorHex: "#d97706",
  },
  confirmado: {
    label: "Confirmado",
    colorClass: "badge--confirmado",
    colorHex: "#dc2626",
  },
};

export default function Rack() {
  const [rackData, setRackData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const hoyStr = new Date().toISOString().split("T")[0];
  const [fechaInicio, setFechaInicio] = useState(hoyStr);
  const [filtroSalon, setFiltroSalon] = useState("Todos");

  useEffect(() => {
    setLoading(true);
    getRackDisponibilidad({ fechaInicio, salonId: filtroSalon })
      .then((data) => {
        const lista = Array.isArray(data) ? data : data.results || [];
        setRackData(lista);
        setError(null);
      })
      .catch((err) => {
        console.error("Error al cargar disponibilidad:", err);
        setError("No se pudo cargar la disponibilidad desde el servidor.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fechaInicio, filtroSalon]);

  return (
    <div className="salones" style={{ padding: "20px" }}>
      <h2>Rack de Disponibilidad y Bloqueos (RF-04 / RF-07)</h2>

      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "20px",
          background: "#f8f9fa",
          padding: "12px 16px",
          borderRadius: "8px",
          alignItems: "center",
          border: "1px solid #e9ecef",
        }}
      >
        <span>
          <strong>Estado de Ocupación:</strong>
        </span>
        <span style={{ color: "#2e7d32", fontWeight: "600" }}>
          ● Verde: Disponible
        </span>
        <span style={{ color: "#d97706", fontWeight: "600" }}>
          ● Amarillo: Cotizado / Bloqueado
        </span>
        <span style={{ color: "#dc2626", fontWeight: "600" }}>
          ● Rojo: Confirmado
        </span>
      </div>

      <div className="toolbar" style={{ marginBottom: "20px" }}>
        <div className="toolbar__filters">
          <label className="filter">
            <span>Fecha desde:</span>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="search-input"
            />
          </label>
        </div>
      </div>

      {loading ? (
        <p className="salones-empty">
          Cargando disponibilidad desde el servidor...
        </p>
      ) : error ? (
        <p className="salones-empty" style={{ color: "#d9534f" }}>
          {error}
        </p>
      ) : rackData.length === 0 ? (
        <p className="salones-empty">
          No hay registros de disponibilidad para la fecha seleccionada.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="cotizaciones-table">
            <thead>
              <tr>
                <th>Salón</th>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Estado</th>
                <th>Evento / Cliente</th>
                <th>Vigencia Bloqueo</th>
              </tr>
            </thead>
            <tbody>
              {rackData.map((item) => {
                const estadoClave = (item.estado || "disponible").toLowerCase();
                const badgeInfo =
                  ESTADOS_MAP[estadoClave] || ESTADOS_MAP.disponible;

                return (
                  <tr key={item.id || `${item.salon_nombre}-${item.fecha}`}>
                    <td className="cell-strong">
                      {item.salon_nombre || item.salon}
                    </td>
                    <td>{item.fecha}</td>
                    <td>{item.horario || "Todo el día"}</td>
                    <td>
                      <span className={`badge ${badgeInfo.colorClass}`}>
                        {badgeInfo.label}
                      </span>
                    </td>
                    <td>{item.evento_nombre || item.cliente || "—"}</td>
                    <td>{item.vigencia_hasta || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
