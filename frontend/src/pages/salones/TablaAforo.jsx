import { Boton, TablaContenedor, Tarjeta } from "../../components/ui";
import { aforoMaximo, formatoNumero } from "./salones";

// "Aforo por montaje": una fila por salón y una columna por montaje del catálogo.
// El aforo más alto de cada salón se resalta; un guion es un montaje no habilitado.
// - salones: los que dejan ver los filtros.
// - habilitadosDe(salonId), etiquetaSalon(salon): de useSalones.
// - onHabilitar(evento): abre "Habilitar montaje" sin salón elegido.
export default function TablaAforo({ salones, montajes, habilitadosDe, etiquetaSalon, onHabilitar }) {
  return (
    <Tarjeta as="section" className="salones-aforo" aria-labelledby="salones-aforo-titulo">
      <div className="salones-aforo__cabecera">
        <div>
          <h2 id="salones-aforo-titulo" className="salones-aforo__titulo">Aforo por montaje</h2>
          <p className="salones-aforo__nota">Un guion significa que ese montaje no está habilitado en el salón.</p>
        </div>
        <Boton
          variante="secundario"
          disabled={montajes.length === 0}
          onClick={onHabilitar}
        >
          Habilitar montaje
        </Boton>
      </div>

      <TablaContenedor etiqueta="Aforo por montaje de cada salón" className="salones-aforo__caja">
        <table className="salones-aforo__tabla">
          <thead>
            <tr>
              <th scope="col">Salón</th>
              {montajes.map((m) => (
                <th key={m.id} scope="col">{m.nombre}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {salones.map((s) => {
              const habilitados = habilitadosDe(s.id);
              const maximo = aforoMaximo(habilitados);
              return (
                <tr key={s.id} className={s.activo === false ? "salones-aforo__fila--baja" : undefined}>
                  <th scope="row">
                    {etiquetaSalon(s)}
                    {s.activo === false && <span className="salones-aforo__baja">Dado de baja</span>}
                  </th>
                  {montajes.map((m) => {
                    const h = habilitados.find((x) => x.montajeId === m.id);
                    if (!h) {
                      return (
                        <td key={m.id} className="salones-aforo__celda salones-aforo__celda--vacia">
                          <span aria-hidden="true">—</span>
                          <span className="visually-hidden">No habilitado</span>
                        </td>
                      );
                    }
                    const esMaximo = h.aforo === maximo;
                    return (
                      <td
                        key={m.id}
                        className={`salones-aforo__celda ${esMaximo ? "salones-aforo__celda--maximo" : ""}`}
                      >
                        {formatoNumero.format(h.aforo)}
                        {esMaximo && <span className="visually-hidden"> (máximo del salón)</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </TablaContenedor>
    </Tarjeta>
  );
}
