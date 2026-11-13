import { Boton } from "../../components/ui";

function Chips({ etiqueta, opciones, valor, onCambiar }) {
  return (
    <div className="calendario-chips" role="group" aria-label={etiqueta}>
      {[{ id: "todos", nombre: "Todos" }, ...opciones].map((o) => (
        <button
          key={o.id}
          type="button"
          className="calendario-chips__chip"
          aria-pressed={valor === o.id}
          onClick={() => onCambiar(o.id)}
        >
          {o.nombre}
        </button>
      ))}
    </div>
  );
}

function Flecha({ direccion }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direccion === "anterior" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

export default function FiltrosCalendario({
  onMesAnterior, onMesSiguiente, onHoy, enMesActual,
  sitios, filtroSitio, onSitio, salones, filtroSalon, onSalon,
}) {
  return (
    <div className="calendario-filtros">
      <div className="calendario-filtros__mes" role="group" aria-label="Cambiar de mes">
        <Boton variante="secundario" className="calendario-filtros__flecha" aria-label="Mes anterior" onClick={onMesAnterior}>
          <Flecha direccion="anterior" />
        </Boton>
        <Boton variante="secundario" className="calendario-filtros__flecha" aria-label="Mes siguiente" onClick={onMesSiguiente}>
          <Flecha direccion="siguiente" />
        </Boton>
        <Boton variante="secundario" onClick={onHoy} disabled={enMesActual}>
          Hoy
        </Boton>
      </div>
      {sitios.length > 1 && (
        <Chips etiqueta="Filtrar por venue" opciones={sitios} valor={filtroSitio} onCambiar={onSitio} />
      )}
      {salones.length > 1 && (
        <Chips etiqueta="Filtrar por salón" opciones={salones} valor={filtroSalon} onCambiar={onSalon} />
      )}
    </div>
  );
}
