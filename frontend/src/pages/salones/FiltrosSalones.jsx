import InterruptorBajas from "./InterruptorBajas";

// Filtros de Salones: búsqueda por nombre, montaje, aforo mínimo y "Mostrar dados
// de baja". Con filtros puestos, cuenta cuántos salones se ven (visibles de total).
// buscarRef: la búsqueda recibe el foco al quitar los filtros.
export default function FiltrosSalones({
  busqueda,
  onBusqueda,
  buscarRef,
  montajes,
  filtroMontaje,
  onFiltroMontaje,
  aforoMinimo,
  onAforoMinimo,
  mostrarBajas,
  onMostrarBajas,
  hayFiltros,
  visibles,
  total,
}) {
  return (
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
              onChange={(e) => onBusqueda(e.target.value)}
            />
          </div>
        </div>

        <div className="salones-filtro">
          <label className="salones-filtro__etiqueta" htmlFor="salones-filtro-montaje">Montaje</label>
          <select
            id="salones-filtro-montaje"
            className="salones-filtro__control"
            value={filtroMontaje}
            onChange={(e) => onFiltroMontaje(e.target.value)}
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
            onChange={(e) => onAforoMinimo(e.target.value)}
          />
        </div>

        <InterruptorBajas activo={mostrarBajas} onCambiar={onMostrarBajas} />

        <p className="salones-filtros__conteo" role="status">
          {hayFiltros ? `${visibles} de ${total} salones` : ""}
        </p>
      </div>
  );
}
