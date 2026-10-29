export function SelectorRol({ roles, valor, onCambiar, error, bloqueado, ayuda, idPrefix }) {
  const idError = `${idPrefix}-rol-error`;
  return (
    <fieldset className="usuarios-campo" aria-describedby={error ? idError : undefined}>
      <legend className="usuarios-etiqueta">Rol</legend>
      <div className="usuarios-roles" role="radiogroup" aria-label="Rol">
        {roles.map((r) => {
          const elegido = valor === String(r.id);
          return (
            <label key={r.id} className={`usuarios-rol usuarios-rol--${r.codigo}`} data-elegido={elegido || undefined} data-bloqueado={bloqueado || undefined}>
              <input
                type="radio"
                name={`${idPrefix}-rol`}
                className="visually-hidden"
                value={r.id}
                checked={elegido}
                disabled={bloqueado}
                onChange={() => onCambiar(String(r.id))}
              />
              {r.nombre}
            </label>
          );
        })}
      </div>
      {ayuda && <p className="usuarios-ayuda">{ayuda}</p>}
      {error && <p id={idError} className="campo__error">{error}</p>}
    </fieldset>
  );
}

export function SelectorSitios({ sitios, elegidos, onAlternar, error, idPrefix }) {
  return (
    <fieldset className="usuarios-campo">
      <legend className="usuarios-etiqueta">Venues</legend>
      {sitios.length === 0 ? (
        <p className="usuarios-ayuda">No administras ningún venue todavía.</p>
      ) : (
        <div className="usuarios-sitios">
          {sitios.map((s) => (
            <label key={s.id} className="usuarios-sitio">
              <input
                type="checkbox"
                name={`${idPrefix}-sitios`}
                checked={elegidos.includes(String(s.id))}
                onChange={() => onAlternar(s.id)}
              />
              {s.nombre}
            </label>
          ))}
        </div>
      )}
      <p className="usuarios-ayuda">Un proveedor puede no tener venues; un administrador solo ve los datos de sus venues.</p>
      {error && <p className="campo__error">{error}</p>}
    </fieldset>
  );
}
