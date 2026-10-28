import { useRef, useState } from "react";
import { editarSalon } from "../../api/salones";
import { AvisoSesionEnVentana } from "../../components/SesionVencida";
import { Boton, Campo, Dialogo, cerrarDialogoDe } from "../../components/ui";
import { erroresDesdeApi } from "../../utils/erroresApi";
import { cambiosSalon, formDesdeSalon, validarSalon } from "./salones";

const CAMPOS = ["nombre", "ancho", "altura", "foto_url"];

// "Editar salón" (SGDE-88): nombre, ancho, altura y foto (URL). El sitio se
// muestra, pero no se cambia: sus cotizaciones, conceptos y montajes son de ese sitio.
// - salon: el que se edita; sitio: el nombre de su sitio.
// - onGuardado(salon): el API respondió; Salones.jsx lo reemplaza y la cierra.
// - onSesionVencida(), sesionVencida, onEntrarDeNuevo(boton): aviso dentro de la
//   ventana (SGDE-94).
export default function DialogoEditarSalon({ salon, sitio, onGuardado, onCerrar, onSesionVencida, sesionVencida, onEntrarDeNuevo }) {
  const [form, setForm] = useState(() => formDesdeSalon(salon));
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const guardarRef = useRef(null);

  function cambiar(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrores((prev) => ({ ...prev, [name]: undefined }));
  }

  async function guardar(e) {
    e.preventDefault();
    setError(null);
    const locales = validarSalon(form);
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    // Sin cambios no se llama al API: se cierra como "Cancelar".
    const cambios = cambiosSalon(form, salon);
    if (Object.keys(cambios).length === 0) {
      cerrarDialogoDe(e.currentTarget);
      return;
    }

    setGuardando(true);
    try {
      const actualizado = await editarSalon(salon.id, cambios);
      setGuardando(false);
      onGuardado(actualizado);
    } catch (err) {
      setGuardando(false);
      if (err.status === 400 && err.body && typeof err.body === "object") {
        // "Nombre único por sitio" llega como non_field_errors: va debajo del nombre.
        const { non_field_errors, ...porCampo } = err.body;
        const { campos, general } = erroresDesdeApi(porCampo, CAMPOS);
        if (non_field_errors) campos.nombre = "Ya existe un salón con ese nombre en este sitio.";
        setErrores(campos);
        setError(general);
      } else if (err.status === 401) {
        onSesionVencida();
      } else if (err.status === 403) {
        setError("No tienes permiso para editar salones.");
      } else if (err.status === 404) {
        setError("Este salón ya no existe. Cierra y vuelve a cargar la pantalla.");
      } else {
        setError("No pudimos hablar con el servidor. Inténtalo de nuevo.");
      }
    }
  }

  return (
    <Dialogo idTitulo="salones-editar-titulo" titulo="Editar salón" bloqueado={guardando} onCerrar={onCerrar}>
      <form className="dialogo__form" onSubmit={guardar} noValidate>
        {sitio && (
          <p className="salones-dialogo__para">
            En <strong>{sitio}</strong>. El sitio de un salón no se cambia.
          </p>
        )}
        <Campo
          id="editar-salon-nombre"
          etiqueta="Nombre"
          name="nombre"
          type="text"
          autoComplete="off"
          value={form.nombre}
          onChange={cambiar}
          error={errores.nombre}
        />
        <div className="salones-dialogo__par">
          <Campo
            id="editar-salon-ancho"
            etiqueta="Ancho (m)"
            name="ancho"
            type="text"
            inputMode="decimal"
            placeholder="Opcional"
            value={form.ancho}
            onChange={cambiar}
            error={errores.ancho}
          />
          <Campo
            id="editar-salon-altura"
            etiqueta="Altura (m)"
            name="altura"
            type="text"
            inputMode="decimal"
            placeholder="Opcional"
            value={form.altura}
            onChange={cambiar}
            error={errores.altura}
          />
        </div>
        <Campo
          id="editar-salon-foto"
          etiqueta="URL de la foto (opcional)"
          name="foto_url"
          type="url"
          inputMode="url"
          placeholder="https://..."
          value={form.foto_url}
          onChange={cambiar}
          error={errores.foto_url}
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
