import { Campo } from "../../components/ui";
import { hoyISO, medidasSalon } from "./nuevaCotizacion";
import TituloPaso from "./TituloPaso";

function TarjetaSalon({ salon, elegido, onElegir }) {
  const medidas = medidasSalon(salon);
  const capacidad = salon.aforoMaximo ? `hasta ${salon.aforoMaximo}` : "sin montajes habilitados";

  return (
    <label className="nc-salon" data-elegido={elegido || undefined}>
      <input
        type="radio"
        name="nc-salon"
        className="visually-hidden"
        checked={elegido}
        onChange={() => onElegir(salon.id)}
      />
      <span className="nc-salon__nombre">
        {salon.nombre}
        {elegido && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12l5 5 9-10" />
          </svg>
        )}
      </span>
      <span className="nc-salon__detalle">{[medidas, capacidad].filter(Boolean).join(" · ")}</span>
    </label>
  );
}

function SelectorMontaje({ c }) {
  if (!c.salon) return null;
  if (c.salon.montajes.length === 0) {
    return (
      <p className="nc-ayuda">
        Este salón no tiene montajes habilitados. Habilita uno en Salones o elige otro salón.
      </p>
    );
  }
  return (
    <fieldset className="nc-montajes">
      <legend className="nc-etiqueta">Montaje</legend>
      <div className="nc-montajes__opciones">
        {c.salon.montajes.map((m) => (
          <label key={m.id} className="nc-montaje" data-elegido={c.form.montaje === m.id || undefined}>
            <input
              type="radio"
              name="nc-montaje"
              className="visually-hidden"
              checked={c.form.montaje === m.id}
              onChange={() => c.elegirMontaje(m.id)}
            />
            {m.nombre} · {m.aforo}
          </label>
        ))}
      </div>
      {c.errores.campos.montaje && <p className="nc-error">{c.errores.campos.montaje}</p>}
    </fieldset>
  );
}

function ContadorPersonas({ c }) {
  const error = c.errores.campos.cantidad_personas;
  const tono = c.aforo.excede ? "excede" : "ok";

  return (
    <div className="nc-personas">
      <label htmlFor="nc-personas" className="nc-etiqueta">Personas</label>
      <div className="nc-personas__control">
        <button
          type="button"
          className="nc-paso-boton"
          aria-label="Diez personas menos"
          onClick={() => c.cambiarPersonas(-1)}
        >
          −
        </button>
        <input
          id="nc-personas"
          name="cantidad_personas"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          placeholder="0"
          className="nc-personas__numero"
          value={c.form.cantidad_personas}
          onChange={c.cambiarCampo}
          aria-invalid={error ? true : undefined}
          aria-describedby="nc-aforo-texto"
        />
        <button
          type="button"
          className="nc-paso-boton"
          aria-label="Diez personas más"
          onClick={() => c.cambiarPersonas(1)}
        >
          +
        </button>
      </div>
      {c.montaje && (
        <div className="nc-medidor" aria-hidden="true">
          <div className={`nc-medidor__barra nc-medidor__barra--${tono}`} style={{ width: `${c.aforo.porcentaje}%` }} />
        </div>
      )}
      <p id="nc-aforo-texto" className={`nc-aforo nc-aforo--${c.montaje ? tono : "neutro"}`}>
        {c.aforo.texto}
      </p>
      {error && !c.aforo.excede && <p className="nc-error">{error}</p>}
    </div>
  );
}

export default function SeccionEvento({ c }) {
  const hoy = hoyISO();

  return (
    <section className="nc-paso" aria-labelledby="nc-paso-evento">
      <TituloPaso numero={2} id="nc-paso-evento">Salón, montaje y fecha</TituloPaso>

      {c.salones.length === 0 ? (
        <p className="nc-ayuda">No hay salones activos. Crea uno en Salones para poder cotizar.</p>
      ) : (
        <fieldset className="nc-salones">
          <legend className="visually-hidden">Salón</legend>
          {c.salones.map((salon) => (
            <TarjetaSalon key={salon.id} salon={salon} elegido={c.form.salon === salon.id} onElegir={c.elegirSalon} />
          ))}
        </fieldset>
      )}
      {c.errores.campos.salon && <p className="nc-error">{c.errores.campos.salon}</p>}

      <SelectorMontaje c={c} />

      <div className={["campo", c.errores.campos.tipo_evento && "campo--error"].filter(Boolean).join(" ")}>
        <label className="campo__etiqueta" htmlFor="nc-tipo-evento">Tipo de evento</label>
        <select
          id="nc-tipo-evento"
          className="campo__input"
          name="tipo_evento"
          value={c.form.tipo_evento}
          onChange={c.cambiarCampo}
          required
          aria-invalid={c.errores.campos.tipo_evento ? true : undefined}
          aria-describedby={c.errores.campos.tipo_evento ? "nc-tipo-evento-error" : undefined}
        >
          <option value="">Selecciona un tipo de evento</option>
          {c.tiposEvento.map((grupo) => (
            <optgroup key={grupo.id} label={grupo.nombre}>
              {grupo.tipos.map((tipo) => (
                <option key={tipo.id} value={String(tipo.id)}>{tipo.nombre}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {c.errores.campos.tipo_evento && (
          <p id="nc-tipo-evento-error" className="campo__error">{c.errores.campos.tipo_evento}</p>
        )}
      </div>

      <div className="nc-evento-fila">
        <ContadorPersonas c={c} />
        <Campo
          etiqueta="Fecha del evento"
          name="fecha_evento"
          type="date"
          min={hoy}
          value={c.form.fecha_evento}
          onChange={c.cambiarCampo}
          error={c.errores.campos.fecha_evento}
          className="nc-fecha"
        />
        <div className="nc-fecha">
          <Campo
            etiqueta="Válida hasta"
            name="validez_oferta"
            type="date"
            min={hoy}
            max={c.form.fecha_evento || undefined}
            value={c.form.validez_oferta}
            onChange={c.cambiarCampo}
            error={c.errores.campos.validez_oferta}
          />
          {!c.form.validez_oferta && (
            <p className="nc-ayuda">Si la dejas vacía: 15 días o hasta el día del evento.</p>
          )}
        </div>
      </div>

      {c.avisoOcupacion && (
        <p className={`nc-disponibilidad nc-disponibilidad--${c.avisoOcupacion.tono}`} role="status">
          {c.avisoOcupacion.texto}
        </p>
      )}

      {c.aforo.excede && (
        <div className="nc-alerta" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l10 18H2zM12 10v5M12 18h.01" />
          </svg>
          <p>
            El montaje {c.montaje.nombre} del salón {c.salon.nombre} admite {c.montaje.aforo} personas. Elige otro
            montaje o salón, o baja la cantidad para poder guardar.
          </p>
        </div>
      )}
    </section>
  );
}
