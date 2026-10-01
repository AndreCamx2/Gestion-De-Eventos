import { useState, useMemo } from "react";
import NuevoSalonModal from "./NuevoSalonModal";
import "../styles/salones.css";
import auditorioImage from "../img/Salones/auditorio.jpg";
import colonialImage from "../img/Salones/colonial.jpg";
import esmeraldaImage from "../img/Salones/esmeralda.jpg";
import imperialImage from "../img/Salones/imperial.jpg";
import jardinImage from "../img/Salones/jardin.jpg";
import terrazaImage from "../img/Salones/terraza-del-mar.jpg";

// (algo como GET /api/salones) cuando el backend esté listo se colocarán las rutas reales. La ruta de
// "foto" debe apuntar a una imagen real del salón una vez se tenga.
const SALONES_MOCK = [
  { id: 1, nombre: "Salón Imperial", estado: "Disponible", capacidad: 333, montajes: ["Teatro", "Banquete", "Cóctel"], foto: imperialImage },
  { id: 2, nombre: "Salón Esmeralda", estado: "Disponible", capacidad: 111, montajes: ["Teatro", "Escuela", "Banquete"], foto: esmeraldaImage },
  { id: 3, nombre: "Terraza del Mar", estado: "Reservado", capacidad: 222, montajes: ["Cóctel", "Banquete"], foto: terrazaImage },
  { id: 4, nombre: "Salón Colonial", estado: "Disponible", capacidad: 444, montajes: ["Banquete", "Cóctel"], foto: colonialImage },
  { id: 5, nombre: "Auditorio Principal", estado: "Reservado", capacidad: 555, montajes: ["Teatro"], foto: auditorioImage },
  { id: 6, nombre: "Jardín de los Naranjos", estado: "Disponible", capacidad: 678, montajes: ["Cóctel", "Banquete"], foto: jardinImage },
];

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
  const [salones, setSalones] = useState(SALONES_MOCK);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCapacidad, setFiltroCapacidad] = useState("Cualquiera");
  const [filtroMontaje, setFiltroMontaje] = useState("Cualquiera");

  // Con el backend conectado, lo ideal es mandar estos filtros como
  // query params y dejar que la búsqueda/paginación la haga el servidor.
  const salonesFiltrados = useMemo(() => {
    return salones.filter((s) => {
      const coincideBusqueda = s.nombre.toLowerCase().includes(busqueda.toLowerCase());
      const coincideCapacidad = cumpleCapacidad(s.capacidad, filtroCapacidad);
      const coincideMontaje = filtroMontaje === "Cualquiera" || s.montajes.includes(filtroMontaje);
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
            <select value={filtroCapacidad} onChange={(e) => setFiltroCapacidad(e.target.value)}>
              {CAPACIDADES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label className="filter">
            <span>Montaje:</span>
            <select value={filtroMontaje} onChange={(e) => setFiltroMontaje(e.target.value)}>
              {MONTAJES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        </div>

        <button type="button" className="btn btn--primary" onClick={() => setModalAbierto(true)}>
          + Nuevo salón
        </button>
      </div>

      <div className="salones-grid">
        {salonesFiltrados.map((salon) => (
          <article className="salon-card" key={salon.id}>
            <div className="salon-card__photo">
              <img src={salon.foto} alt={salon.nombre} />
              <span className={`badge badge--${salon.estado.toLowerCase()}`}>{salon.estado}</span>
            </div>

            <div className="salon-card__body">
              <h3 className="salon-card__title">{salon.nombre}</h3>
              <p className="salon-card__capacity">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="15" height="15">
                  <circle cx="9" cy="9" r="3" />
                  <path d="M3.5 19c.8-3 2.9-4.5 5.5-4.5s4.7 1.5 5.5 4.5" strokeLinecap="round" />
                </svg>
                Hasta {salon.capacidad} personas
              </p>
              <div className="salon-card__tags">
                {salon.montajes.map((m) => <span key={m} className="pill">{m}</span>)}
              </div>
              <button type="button" className="btn btn--outline btn--block">Ver detalles</button>
            </div>
          </article>
        ))}

        {salonesFiltrados.length === 0 && (
          <p className="salones-empty">No hay salones que coincidan con la búsqueda.</p>
        )}
      </div>

      {modalAbierto && (
        <NuevoSalonModal
          onClose={() => setModalAbierto(false)}
          onCreate={handleCrearSalon}
        />
      )}
    </div>
  );
}
