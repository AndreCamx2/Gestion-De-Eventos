import { useRef, useState } from "react";
import { bloquearCotizacion, liberarBloqueo } from "../../api/cotizaciones";
import { AvisoSesionEnVentana } from "../SesionVencida";
import { AvisoError, Boton, Dialogo, EstadoBadge } from "../ui";
import { estadoVisible } from "../../utils/estadosCotizacion";
import { fechaHoraColombia } from "../../utils/fechasBloqueo";
import { fechaLarga, numero } from "../../utils/inicioCifras";
import FormBloqueo from "./FormBloqueo";
import "./bloqueo.css";

// Panel del día de un salón: sus cotizaciones (también las vencidas) y las acciones
// Bloquear y Liberar. Aceptar y cancelar van en el Detalle de cotización, no aquí.
// Lo abren el Rack (SGDE-69) y el Calendario (SGDE-45).
// - cotizaciones: las de ese salón y día; la pantalla las vuelve a pasar tras cada recarga.
// - esPasado: un día anterior a hoy no ofrece "Bloquear" (el backend daría 400);
//   "Liberar" sí, si la cotización sigue bloqueada.
// - onCambio(): la pantalla recarga sus datos después de una acción que salió bien.
// - Sesión vencida (SGDE-94): onSesionVencida(), sesionVencida y onEntrarDeNuevo(boton);
//   la ventana no se cierra ni redirige a /login.
const MENSAJES = {
  403: "No tienes permisos para cambiar esta cotización.",
  404: "Esta cotización ya no existe. Cierra esta ventana y vuelve a cargar la página.",
};

export default function DialogoDiaSalon({
  salon, dia, esPasado, cotizaciones, onCambio, onCerrar, onSesionVencida, sesionVencida, onEntrarDeNuevo,
}) {
  // accion: { tipo: "bloquear" | "liberar", id } o null
  const [accion, setAccion] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [errorCampo, setErrorCampo] = useState(null);
  const [error, setError] = useState(null); // { tipo, titulo?, texto } para AvisoError
  const botonRef = useRef(null);

  function elegir(nueva) {
    setAccion(nueva);
    setError(null);
    setErrorCampo(null);
  }

  async function ejecutar(peticion) {
    setProcesando(true);
    setError(null);
    setErrorCampo(null);
    try {
      await peticion();
      await onCambio();
      setAccion(null);
    } catch (err) {
      if (err.status === 401) {
        onSesionVencida();
      } else if (err.status === 400 && err.body?.bloqueo_hasta) {
        setErrorCampo([].concat(err.body.bloqueo_hasta)[0]);
      } else if (err.status === 409) {
        setError({ tipo: "conflicto", texto: err.body?.detail });
      } else {
        setError({
          tipo: "servidor",
          titulo: "No se pudo hacer el cambio",
          texto: MENSAJES[err.status] ?? "Error inesperado en el servidor. Intenta de nuevo.",
        });
      }
    } finally {
      setProcesando(false);
    }
  }

  return (
    <Dialogo
      idTitulo="dialogo-dia-titulo"
      titulo={`${salon.nombre} · ${fechaLarga(dia)}`}
      bloqueado={procesando}
      onCerrar={onCerrar}
      className="dialogo-dia"
    >
      {cotizaciones.length === 0 ? (
        <p className="dialogo-dia__vacio">Sin cotizaciones para este día: el salón está disponible.</p>
      ) : (
        <ul className="dialogo-dia__lista">
          {cotizaciones.map((c) => {
            const estado = estadoVisible(c);
            const puedeBloquear = estado === "cotizado" && !esPasado;
            const activa = accion?.id === c.id;
            return (
              <li key={c.id} className="dialogo-dia__item">
                <div className="dialogo-dia__cabecera">
                  <p className="dialogo-dia__cliente">{c.cliente_nombre}</p>
                  <EstadoBadge estado={estado} />
                </div>
                <p className="dialogo-dia__detalle">
                  {c.montaje_nombre} · {numero(c.cantidad_personas)} personas
                </p>
                {c.estado === "bloqueado" && c.bloqueo_hasta && (
                  <p className="dialogo-dia__bloqueo">Bloqueada hasta {fechaHoraColombia(c.bloqueo_hasta)}</p>
                )}

                {activa && accion.tipo === "bloquear" && (
                  <FormBloqueo
                    cotizacion={c}
                    error={errorCampo}
                    procesando={procesando}
                    guardarRef={botonRef}
                    onCancelar={() => elegir(null)}
                    onGuardar={(iso) => ejecutar(() => bloquearCotizacion(c.id, iso))}
                  />
                )}
                {activa && accion.tipo === "liberar" && (
                  <div className="dialogo-dia__confirmar">
                    <p className="dialogo-dia__pregunta">¿Liberar el bloqueo? La fecha queda libre para otras cotizaciones.</p>
                    <div className="dialogo-dia__acciones">
                      <Boton variante="secundario" disabled={procesando} onClick={() => elegir(null)}>
                        Cancelar
                      </Boton>
                      <Boton
                        ref={botonRef}
                        variante="peligro"
                        disabled={procesando}
                        onClick={() => ejecutar(() => liberarBloqueo(c.id))}
                        data-foco-inicial
                      >
                        {procesando ? "Liberando…" : "Liberar"}
                      </Boton>
                    </div>
                  </div>
                )}

                {!activa && (puedeBloquear || c.estado === "bloqueado") && (
                  <div className="dialogo-dia__acciones">
                    {puedeBloquear && (
                      <Boton variante="secundario" onClick={() => elegir({ tipo: "bloquear", id: c.id })}>
                        Bloquear
                      </Boton>
                    )}
                    {c.estado === "bloqueado" && (
                      <Boton variante="secundario" onClick={() => elegir({ tipo: "liberar", id: c.id })}>
                        Liberar
                      </Boton>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {sesionVencida && <AvisoSesionEnVentana onEntrar={() => onEntrarDeNuevo(botonRef.current)} />}
      {error && (
        <AvisoError tipo={error.tipo} titulo={error.titulo} texto={error.texto} nivel="h3" className="dialogo-dia__error" />
      )}
    </Dialogo>
  );
}
