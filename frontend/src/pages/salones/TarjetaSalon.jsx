import { useState } from "react";
import { Link } from "react-router-dom";
import { Boton } from "../../components/ui";
import { aforoMaximo, formatoNumero, metros } from "./salones";

// Tarjeta de un salón (maqueta Salones): foto o marcador, medidas, aforo máximo
// y sus montajes. "Ver disponibilidad" abre el Calendario con ese salón (SGDE-45)
// y "Editar" abre la ventana de edición (SGDE-88). Cada montaje habilitado tiene
// "Editar aforo" y "Quitar". "Dar de baja" lo saca de la operación (SGDE-99): un
// salón dado de baja se ve atenuado, con la etiqueta "Dado de baja", y solo ofrece
// "Reactivar".
// - onEditar(evento), onHabilitar(evento), onCambiarActivo(evento): abren sus ventanas.
// - onEditarAforo(habilitado, evento), onQuitarMontaje(habilitado, evento): ídem
//   para un montaje ({ id, montajeId, nombre, aforo }).
export default function TarjetaSalon({
  salon,
  sitio,
  habilitados,
  puedeHabilitar,
  onEditar,
  onHabilitar,
  onEditarAforo,
  onQuitarMontaje,
  onCambiarActivo,
}) {
  // Si la URL de la foto no carga, se muestra el marcador en su lugar.
  const [fotoFallo, setFotoFallo] = useState(false);
  const conFoto = Boolean(salon.foto_url) && !fotoFallo;
  const maximo = aforoMaximo(habilitados);
  const idTitulo = `salon-${salon.id}-titulo`;
  // Tres tonos de tokens.css que se alternan para distinguir los marcadores.
  const tono = salon.id % 3;
  const activo = salon.activo !== false;

  return (
    <article className={`salon-tarjeta ${activo ? "" : "salon-tarjeta--inactiva"}`} aria-labelledby={idTitulo}>
      <div className={`salon-tarjeta__foto ${conFoto ? "" : `salon-tarjeta__foto--tono-${tono}`}`}>
        {conFoto && (
          <img
            className="salon-tarjeta__imagen"
            src={salon.foto_url}
            alt={`Foto del salón ${salon.nombre}`}
            loading="lazy"
            onError={() => setFotoFallo(true)}
          />
        )}
        {sitio && <span className="salon-tarjeta__sitio">{sitio}</span>}
        {!conFoto && (
          <h2 id={idTitulo} className="salon-tarjeta__nombre-grande" title={salon.nombre}>
            {salon.nombre}
          </h2>
        )}
      </div>

      <div className="salon-tarjeta__cuerpo">
        {conFoto && (
          <h2 id={idTitulo} className="salon-tarjeta__nombre">{salon.nombre}</h2>
        )}

        {!activo && <p className="salon-tarjeta__baja">Dado de baja</p>}

        <ul className="salon-tarjeta__datos">
          <li><strong>{metros(salon.ancho)}</strong> de ancho</li>
          <li><strong>{metros(salon.altura)}</strong> de altura</li>
          <li><strong>{maximo === null ? "—" : formatoNumero.format(maximo)}</strong> máx.</li>
        </ul>

        {habilitados.length > 0 ? (
          <ul className="salon-tarjeta__filas" aria-label={`Montajes de ${salon.nombre}`}>
            {habilitados.map((h) => (
              <li key={h.id} className="salon-tarjeta__fila">
                <span className="salon-tarjeta__fila-montaje">
                  {h.nombre}
                  <strong>{formatoNumero.format(h.aforo)}</strong>
                </span>
                {activo && (
                  <>
                    <Boton
                      variante="secundario"
                      className="salon-tarjeta__fila-accion"
                      aria-label={`Editar aforo de ${h.nombre} en ${salon.nombre}`}
                      onClick={(e) => onEditarAforo(h, e)}
                    >
                      Editar aforo
                    </Boton>
                    <Boton
                      variante="peligro"
                      className="salon-tarjeta__fila-accion"
                      aria-label={`Quitar ${h.nombre} de ${salon.nombre}`}
                      onClick={(e) => onQuitarMontaje(h, e)}
                    >
                      Quitar
                    </Boton>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="salon-tarjeta__sin-montajes">Sin montajes habilitados.</p>
        )}

        <div className="salon-tarjeta__acciones">
          {activo && (
            <>
              <Boton
                as={Link}
                to={`/calendario?salon=${salon.id}`}
                variante="oscuro"
                className="salon-tarjeta__accion"
                aria-label={`Ver disponibilidad de ${salon.nombre}`}
              >
                Ver disponibilidad
              </Boton>
              <Boton
                variante="secundario"
                className="salon-tarjeta__accion salon-tarjeta__accion--corta"
                aria-label={`Editar ${salon.nombre}`}
                onClick={onEditar}
              >
                Editar
              </Boton>
              {puedeHabilitar && (
                <Boton
                  id={`salon-${salon.id}-habilitar`}
                  variante="secundario"
                  className="salon-tarjeta__accion"
                  aria-label={`Habilitar montaje en ${salon.nombre}`}
                  onClick={onHabilitar}
                >
                  Habilitar montaje
                </Boton>
              )}
            </>
          )}
          <Boton
            id={`salon-${salon.id}-estado`}
            variante={activo ? "peligro" : "oscuro"}
            className="salon-tarjeta__accion"
            aria-label={`${activo ? "Dar de baja" : "Reactivar"} ${salon.nombre}`}
            onClick={onCambiarActivo}
          >
            {activo ? "Dar de baja" : "Reactivar"}
          </Boton>
        </div>
      </div>
    </article>
  );
}
