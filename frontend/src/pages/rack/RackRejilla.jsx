import { fechaISO } from "../../utils/inicioCifras";
import {
  ABREVIATURAS,
  encabezadoDia,
  esFinDeSemana,
  etiquetaCelda,
  fechaHoraColombia,
} from "./rack";

// Rejilla del Rack: filas = salones, columnas = días.
// - Cada celda es un <button>: Enter y Espacio la abren sin código extra.
// - El estado se dice con texto ("Conf.", "+2") y en el aria-label, no solo con color.
// - En teléfono la tabla se desplaza dentro de su contenedor; la columna de
//   salones queda fija (position: sticky en rack.css).
// - onAbrir(salon, fecha, boton): Rack.jsx abre el panel del día.

function tituloCelda(celda) {
  const bloqueos = celda.cotizaciones
    .filter((c) => c.estado === "bloqueado" && c.bloqueo_hasta)
    .map((c) => `Bloqueado hasta ${fechaHoraColombia(c.bloqueo_hasta)}`);
  return bloqueos.length ? bloqueos.join("\n") : undefined;
}

function Celda({ salon, dia, celda, onAbrir }) {
  const ocupada = celda.estado !== "disponible";
  return (
    <td className="rack-rejilla__celda">
      <button
        type="button"
        className={`rack-celda rack-celda--${celda.estado}`}
        aria-label={etiquetaCelda(salon.nombre, dia, celda)}
        title={tituloCelda(celda)}
        onClick={(e) => onAbrir(salon, dia, e.currentTarget)}
      >
        {ocupada && (
          <span className="rack-celda__texto" aria-hidden="true">
            {ABREVIATURAS[celda.estado]}
            {celda.cantidad > 1 && <span className="rack-celda__cantidad">+{celda.cantidad}</span>}
          </span>
        )}
      </button>
    </td>
  );
}

export default function RackRejilla({ salones, dias, rejilla, hoy, onAbrir }) {
  const hoyISO = fechaISO(hoy);
  return (
    <div className="rack-rejilla" tabIndex={0} role="region" aria-label="Ocupación de salones por día">
      <table className="rack-rejilla__tabla">
        <thead>
          <tr>
            <th scope="col" className="rack-rejilla__esquina">
              Salón
            </th>
            {dias.map((dia) => {
              const { semana, numero } = encabezadoDia(dia);
              const clases = [
                "rack-rejilla__dia",
                esFinDeSemana(dia) && "rack-rejilla__dia--fin-de-semana",
                fechaISO(dia) === hoyISO && "rack-rejilla__dia--hoy",
              ];
              return (
                <th key={fechaISO(dia)} scope="col" className={clases.filter(Boolean).join(" ")}>
                  <span className="rack-rejilla__semana">{semana}</span>
                  <span className="rack-rejilla__numero">{numero}</span>
                  {fechaISO(dia) === hoyISO && <span className="visually-hidden">(hoy)</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {salones.map((salon) => (
            <tr key={salon.id}>
              <th scope="row" className="rack-rejilla__salon" title={salon.nombre}>
                {salon.nombre}
              </th>
              {dias.map((dia) => (
                <Celda
                  key={fechaISO(dia)}
                  salon={salon}
                  dia={dia}
                  celda={rejilla[salon.id][fechaISO(dia)]}
                  onAbrir={onAbrir}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
