import { Boton, EstadoBadge, Tarjeta } from "../../components/ui";
import { estadoMasFuerte } from "../../utils/estadosCotizacion";
import { numero } from "../../utils/inicioCifras";
import { diaDeLaSemana, diaYMes, notaCotizacion } from "./calendario";

// Panel del día seleccionado (aside de la maqueta): una tarjeta por salón del filtro,
// con su estado del día y sus cotizaciones, también las vencidas.
// - lista: las cotizaciones del día (de los salones del filtro).
// - onGestionar(salon, boton): abre el DialogoDiaSalon compartido.
// "Cotizar este día" (maqueta) no está: la pantalla de Nueva cotización aún no existe.
export default function PanelDia({ dia, salones, lista = [], onGestionar }) {
  return (
    <Tarjeta as="aside" className="calendario-panel" aria-labelledby="calendario-panel-titulo">
      <div>
        <p className="calendario-panel__semana">{diaDeLaSemana(dia)}</p>
        <h2 id="calendario-panel-titulo" className="calendario-panel__titulo">{diaYMes(dia)}</h2>
      </div>

      {salones.map((salon) => {
        const delSalon = lista.filter((c) => c.salon === salon.id);
        return (
          <section key={salon.id} className="calendario-salon" aria-label={salon.nombre}>
            <div className="calendario-salon__cabecera">
              <h3 className="calendario-salon__nombre">{salon.nombre}</h3>
              <EstadoBadge estado={estadoMasFuerte(delSalon)} />
            </div>

            {delSalon.length === 0 ? (
              <p className="calendario-salon__vacio">Sin cotizaciones para este día.</p>
            ) : (
              <ul className="calendario-salon__lista">
                {delSalon.map((c) => {
                  const nota = notaCotizacion(c);
                  return (
                    <li key={c.id} className="calendario-salon__cotizacion">
                      <p className="calendario-salon__cliente">{c.cliente_nombre}</p>
                      <p className="calendario-salon__detalle">
                        {c.montaje_nombre} · {numero(c.cantidad_personas)} personas
                      </p>
                      {nota.texto && (
                        <p className={`calendario-salon__nota calendario-salon__nota--${nota.estado}`}>{nota.texto}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {delSalon.length > 0 && (
              <Boton
                variante="secundario"
                className="calendario-salon__gestionar"
                aria-label={`Gestionar ${salon.nombre}, ${diaYMes(dia)}`}
                onClick={(e) => onGestionar(salon, e.currentTarget)}
              >
                Gestionar
              </Boton>
            )}
          </section>
        );
      })}
    </Tarjeta>
  );
}
