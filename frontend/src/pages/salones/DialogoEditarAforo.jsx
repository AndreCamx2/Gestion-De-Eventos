import { useRef, useState } from "react";
import { editarAforo } from "../../api/salones";
import { AvisoSesionEnVentana } from "../../components/SesionVencida";
import { Boton, Campo, Dialogo, cerrarDialogoDe } from "../../components/ui";
import { erroresDesdeApi } from "../../utils/erroresApi";
import { validarAforo } from "./salones";

// "Editar aforo" de un montaje habilitado (SGDE-88): PATCH /api/salon-montajes/<id>/.
// Si hay cotizaciones activas con más personas, el API da 400 bajo "aforo".
// - salon: el salón; habilitado: { id, nombre, aforo } del montaje.
// - onGuardado(salonMontaje): el API respondió; Salones.jsx lo reemplaza y la cierra.
// - onSesionVencida(), sesionVencida, onEntrarDeNuevo(boton): aviso dentro de la
//   ventana (SGDE-94).
export default function DialogoEditarAforo({ salon, habilitado, onGuardado, onCerrar, onSesionVencida, sesionVencida, onEntrarDeNuevo }) {
  const [aforo, setAforo] = useState(String(habilitado.aforo));
  const [errorAforo, setErrorAforo] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const guardarRef = useRef(null);

  async function guardar(e) {
    e.preventDefault();
    setError(null);
    const local = validarAforo(aforo);
    setErrorAforo(local);
    if (local) return;
    if (Number(aforo) === habilitado.aforo) {
      cerrarDialogoDe(e.currentTarget);
      return;
    }

    setGuardando(true);
    try {
      const actualizado = await editarAforo(habilitado.id, Number(aforo));
      setGuardando(false);
      onGuardado(actualizado);
    } catch (err) {
      setGuardando(false);
      if (err.status === 400) {
        const { campos, general } = erroresDesdeApi(err.body, ["aforo"]);
        setErrorAforo(campos.aforo ?? null);
        setError(general);
      } else if (err.status === 401) {
        onSesionVencida();
      } else if (err.status === 403) {
        setError("No tienes permiso para editar montajes.");
      } else if (err.status === 404) {
        setError("Este montaje ya no está habilitado. Cierra y vuelve a cargar la pantalla.");
      } else {
        setError("No pudimos hablar con el servidor. Inténtalo de nuevo.");
      }
    }
  }

  return (
    <Dialogo idTitulo="salones-aforo-editar-titulo" titulo="Editar aforo" bloqueado={guardando} onCerrar={onCerrar}>
      <form className="dialogo__form" onSubmit={guardar} noValidate>
        <p className="salones-dialogo__para">
          <strong>{habilitado.nombre}</strong> en {salon.nombre}
        </p>
        <Campo
          id="editar-aforo"
          etiqueta="Aforo (personas)"
          name="aforo"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={aforo}
          onChange={(e) => {
            setAforo(e.target.value);
            setErrorAforo(null);
          }}
          error={errorAforo}
        />
        {sesionVencida && <AvisoSesionEnVentana onEntrar={() => onEntrarDeNuevo(guardarRef.current)} />}
        {error && <p className="dialogo__error" role="alert">{error}</p>}
        <div className="dialogo__acciones">
          <Boton variante="secundario" disabled={guardando} onClick={(e) => cerrarDialogoDe(e.currentTarget)}>
            Cancelar
          </Boton>
          <Boton ref={guardarRef} type="submit" variante="oscuro" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar"}
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}
