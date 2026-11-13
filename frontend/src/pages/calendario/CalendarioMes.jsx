import { fechaISO } from "../../utils/inicioCifras";
import { ENCABEZADOS, estadosDelDia, etiquetaDia, nombreEnPildora, pildorasDelDia } from "./calendario";

function Dia({ dia, lista, enMes, esHoy, seleccionado, onSeleccionar }) {
  const { visibles, restantes } = pildorasDelDia(lista);
  const clases = [
    "calendario-dia",
    !enMes && "calendario-dia--fuera",
    esHoy && "calendario-dia--hoy",
  ];
  return (
    <button
      type="button"
      className={clases.filter(Boolean).join(" ")}
      aria-label={etiquetaDia(dia, lista, esHoy)}
      aria-pressed={seleccionado}
      onClick={() => onSeleccionar(fechaISO(dia))}
    >
      <span className="calendario-dia__numero" aria-hidden="true">{dia.getDate()}</span>
      {visibles.length > 0 && (
        <span className="calendario-dia__pildoras" aria-hidden="true">
          {visibles.map((c) => (
            <span key={c.id} className={`calendario-pildora calendario-pildora--${c.estado}`}>
              {nombreEnPildora(c.salon_nombre)} · {c.cliente_nombre}
            </span>
          ))}
          {restantes > 0 && <span className="calendario-dia__mas">+{restantes} más</span>}
        </span>
      )}
      {visibles.length > 0 && (
        <span className="calendario-dia__puntos" aria-hidden="true">
          {estadosDelDia(lista).map((estado) => (
            <span key={estado} className={`calendario-punto calendario-punto--${estado}`} />
          ))}
        </span>
      )}
    </button>
  );
}

export default function CalendarioMes({ dias, mes, porDia, hoy, seleccion, onSeleccionar }) {
  const hoyISO = fechaISO(hoy);
  return (
    <div className="calendario-mes">
      {ENCABEZADOS.map((nombre) => (
        <span
          key={nombre}
          className={`calendario-mes__semana ${nombre === "SÁB" ? "calendario-mes__semana--sabado" : ""}`}
          aria-hidden="true"
        >
          {nombre}
        </span>
      ))}
      {dias.map((dia) => {
        const clave = fechaISO(dia);
        return (
          <Dia
            key={clave}
            dia={dia}
            lista={porDia[clave]}
            enMes={dia.getMonth() === mes.getMonth()}
            esHoy={clave === hoyISO}
            seleccionado={clave === seleccion}
            onSeleccionar={onSeleccionar}
          />
        );
      })}
    </div>
  );
}

export function EsqueletoMes() {
  return (
    <div className="calendario-mes calendario-mes--cargando" role="status" aria-busy="true">
      <span className="visually-hidden">Cargando el calendario…</span>
      {ENCABEZADOS.map((nombre) => (
        <span key={nombre} className="calendario-mes__semana" aria-hidden="true">{nombre}</span>
      ))}
      {Array.from({ length: 42 }, (_, i) => (
        <span key={i} className="calendario-dia calendario-dia--esqueleto" aria-hidden="true">
          <span className="esqueleto__bloque calendario-dia__bloque" />
        </span>
      ))}
    </div>
  );
}
