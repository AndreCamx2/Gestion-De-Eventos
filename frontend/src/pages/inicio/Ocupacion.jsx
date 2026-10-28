import { Link } from "react-router-dom";
import { Boton, Esqueleto, EstadoVacio, Tarjeta } from "../../components/ui";
import { numero, ocupacionPorSalon } from "../../utils/inicioCifras";
import { AvisoBloque, SinDatos } from "./AvisosBloque";
import { DIAS_VENTANA, puedeEntrar } from "./inicio";

export default function Ocupacion({ rol, calendario, salones, onReintentarSalones }) {
  const listo = calendario.fase === "listo" && salones.fase === "listo";
  const filas = listo ? ocupacionPorSalon(calendario.datos, salones.datos, DIAS_VENTANA) : [];
  const cargando = calendario.fase === "cargando" || salones.fase === "cargando";

  let cuerpo = null;
  if (calendario.fase === "error") {
    // El aviso con "Reintentar" ya está en la agenda, que usa la misma petición.
    cuerpo = <SinDatos>Sin datos: no se pudo cargar el calendario.</SinDatos>;
  } else if (salones.fase === "error") {
    cuerpo = (
      <AvisoBloque error={salones.error} texto="No se pudieron cargar los salones." onReintentar={onReintentarSalones} />
    );
  } else if (cargando) {
    cuerpo = <Esqueleto filas={3} avatar={false} etiqueta="Cargando la ocupación…" />;
  } else if (filas.length === 0) {
    cuerpo = (
      <EstadoVacio
        nivel="h3"
        titulo="Aún no hay salones"
        texto="Cuando registres salones, verás aquí cuántos días están ocupados."
        accion={
          puedeEntrar("/salones", rol) && (
            <Boton as={Link} to="/salones" variante="secundario">Ir a Salones</Boton>
          )
        }
      />
    );
  } else {
    cuerpo = (
      <ul className="inicio-ocupacion">
        {filas.map((f, i) => (
          <li key={f.id} className="inicio-ocupacion__fila">
            <span className="inicio-ocupacion__nombre">{f.nombre}</span>
            <span className="inicio-ocupacion__barra" aria-hidden="true">
              <span
                className={`inicio-ocupacion__relleno inicio-ocupacion__relleno--tono-${i % 3}`}
                style={{ width: `${f.porcentaje}%` }}
              />
            </span>
            <span className="inicio-ocupacion__pct">
              {f.porcentaje}%
              <span className="visually-hidden">
                {" "}({numero(f.ocupados)} de {DIAS_VENTANA} días con evento confirmado o bloqueado)
              </span>
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Tarjeta as="section" className="inicio-bloque inicio-bloque--compacto" aria-labelledby="inicio-ocupacion-titulo">
      <h2 id="inicio-ocupacion-titulo" className="inicio-cifra__titulo">Ocupación · 30 días</h2>
      {cuerpo}
    </Tarjeta>
  );
}
