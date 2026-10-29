// Filtros de la pantalla de Conceptos.

// En la cabecera: sitio y "Mostrar inactivos".
export function FiltrosCabecera({ sitios, filtroSitio, onFiltroSitio, mostrarInactivos, onMostrarInactivos }) {
  return (
    <>
      <label className="conceptos-sitio">
        <span className="conceptos-sitio__etiqueta">Venue</span>
        <select
          className="conceptos-sitio__control"
          value={filtroSitio}
          onChange={(e) => onFiltroSitio(e.target.value)}
        >
          <option value="todos">Todos los venues</option>
          {sitios.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="conceptos-inactivos">
        <input
          type="checkbox"
          checked={mostrarInactivos}
          onChange={(e) => onMostrarInactivos(e.target.checked)}
        />
        Mostrar inactivos
      </label>
    </>
  );
}

// Búsqueda por nombre, encima de la tabla. `ref` va al campo de texto (para
// devolverle el foco al quitar los filtros).
export function BuscarConcepto({ ref, valor, onCambiar }) {
  return (
    <label className="conceptos-buscar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <span className="visually-hidden">Buscar concepto por nombre</span>
      <input
        ref={ref}
        type="search"
        className="conceptos-buscar__input"
        placeholder="Nombre del concepto"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
      />
    </label>
  );
}
