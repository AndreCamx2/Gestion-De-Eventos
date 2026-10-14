import { FILTROS_TIPO } from "./clientes";

// Filtros del directorio: tipo de cliente, búsqueda y "Mostrar inactivos".
// buscarRef: el campo de búsqueda recibe el foco al quitar los filtros.
export default function FiltrosClientes({
  filtroTipo,
  onFiltroTipo,
  busqueda,
  onBusqueda,
  buscarRef,
  mostrarInactivos,
  onAlternarInactivos,
}) {
  return (
    <div className="directorio-filtros">
      <div className="directorio-segmentado" role="group" aria-label="Tipo de cliente">
        {FILTROS_TIPO.map((f) => (
          <button
            key={f.value}
            type="button"
            className="directorio-segmentado__opcion"
            aria-pressed={filtroTipo === f.value}
            onClick={() => onFiltroTipo(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="directorio-filtros__derecha">
        <label className="directorio-buscar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={buscarRef}
            type="search"
            className="directorio-buscar__input"
            aria-label="Buscar cliente"
            placeholder="Nombre, NIT, cédula o correo"
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
          />
        </label>

        <button
          type="button"
          role="switch"
          className="directorio-interruptor"
          aria-checked={mostrarInactivos}
          onClick={onAlternarInactivos}
        >
          <span className="directorio-interruptor__pista" aria-hidden="true">
            <span className="directorio-interruptor__perilla" />
          </span>
          Mostrar inactivos
        </button>
      </div>
    </div>
  );
}
