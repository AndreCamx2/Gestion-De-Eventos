import { useState, useMemo, useEffect } from "react";
import { getSalones } from "../api/salones";
import NuevoSalonModal from "./NuevoSalonModal";
import "../styles/salones.css";

const CAPACIDADES = ["Cualquiera", "Hasta 150", "Hasta 300", "Más de 300"];
const MONTAJES = ["Cualquiera", "Teatro", "Banquete", "Cóctel", "Escuela"];

function cumpleCapacidad(capacidad, filtro) {
  if (filtro === "Cualquiera") return true;
  if (filtro === "Hasta 150") return capacidad <= 150;
  if (filtro === "Hasta 300") return capacidad <= 300;
  if (filtro === "Más de 300") return capacidad > 300;
  return true;
}

export default function Salones() {
  const [salones, setSalones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCapacidad, setFiltroCapacidad] = useState("Cualquiera");
  const [filtroMontaje, setFiltroMontaje] = useState("Cualquiera");
  useEffect(() => {
    setLoading(true);
    getSalones()
      .then((data) => {
        const listaSalones = Array.isArray(data) ? data : data.results || [];
        setSalones(listaSalones);
        setError(null);
      })
      .catch((err) => {
        console.error("Error al cargar salones:", err);
        setError("No se pudieron cargar los salones del servidor.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const salonesFiltrados = useMemo(() => {
    return salones.filter((s) => {
      const coincideBusqueda = (s.nombre || "")
        .toLowerCase()
        .includes(busqueda.toLowerCase());
      const coincideCapacidad = cumpleCapacidad(s.capacidad, filtroCapacidad);
      const coincideMontaje =
        filtroMontaje === "Cualquiera" ||
        (Array.isArray(s.montajes) && s.montajes.includes(filtroMontaje));
      return coincideBusqueda && coincideCapacidad && coincideMontaje;
    });
  }, [salones, busqueda, filtroCapacidad, filtroMontaje]);

  function handleCrearSalon(nuevoSalon) {
    setSalones((prev) => [nuevoSalon, ...prev]);
  }

  return (
    <div className="salones">
      <div className="toolbar">
        <div className="toolbar__filters">
          <input
            type="text"
            className="search-input"
            placeholder="Buscar salón..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          <label className="filter">
            <span>Capacidad:</span>
            <select
              value={filtroCapacidad}
              onChange={(e) => setFiltroCapacidad(e.target.value)}
            >
              {CAPACIDADES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="filter">
            <span>Montaje:</span>
            <select
              value={filtroMontaje}
              onChange={(e) => setFiltroMontaje(e.target.value)}
            >
              {MONTAJES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setModalAbierto(true)}
        >
          + Nuevo salón
        </button>
      </div>

      {loading ? (
        <p className="salones-empty">Cargando salones desde el servidor...</p>
      ) : error ? (
        <p className="salones-empty" style={{ color: "#d9534f" }}>
          {error}
        </p>
      ) : (
        <div className="salones-grid">
          {salonesFiltrados.map((salon) => (
            <article className="salon-card" key={salon.id}>
              <div className="salon-card__photo">
                <img
                  src={salon.foto || "/placeholder-salon.jpg"}
                  alt={salon.nombre}
                />
                <span
                  className={`badge badge--${(
                    salon.estado || "Disponible"
                  ).toLowerCase()}`}
                >
                  {salon.estado || "Disponible"}
                </span>
              </div>

              <div className="salon-card__body">
                <h3 className="salon-card__title">{salon.nombre}</h3>
                <p className="salon-card__capacity">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    width="15"
                    height="15"
                  >
                    <circle cx="9" cy="9" r="3" />
                    <path
                      d="M3.5 19c.8-3 2.9-4.5 5.5-4.5s4.7 1.5 5.5 4.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  Hasta {salon.capacidad} personas
                </p>
                <div className="salon-card__tags">
                  {Array.isArray(salon.montajes) &&
                    salon.montajes.map((m) => (
                      <span key={m} className="pill">
                        {m}
                      </span>
                    ))}
                </div>
                <button type="button" className="btn btn--outline btn--block">
                  Ver detalles
                </button>
              </div>
            </article>
          ))}

          {salonesFiltrados.length === 0 && (
            <p className="salones-empty">
              No hay salones que coincidan con la búsqueda.
            </p>
          )}
        </div>
      )}

      {modalAbierto && (
        <NuevoSalonModal
          onClose={() => setModalAbierto(false)}
          onCreate={handleCrearSalon}
        />
      )}
    </div>
  );
}
