import { useState } from "react";
import { crearSitio } from "../../api/sitios";
import { Boton, Campo } from "../../components/ui";
import { erroresDesdeApi } from "../../utils/erroresApi";

// Formulario "Nuevo sitio" (maqueta Sitios.dc.html). No es una ventana modal:
// ante un 401 basta la barra de SesionVencida y lo escrito se queda aquí.
// - ciudades: catálogo de /api/ciudades/ para el select.
// - ciudadesFallaron / onReintentarCiudades: si el catálogo no cargó, se avisa
//   debajo del select con un botón para pedirlo otra vez.
// - onCreado(sitio): el sitio que devolvió el API, para agregar su tarjeta.
// - onSesionVencida(): 401 aunque apiFetch intentó renovar el token.
// - nombreRef: la tarjeta "Agregar otro sitio" lleva el foco a este campo.

const CAMPOS = ["nombre", "ciudad"];
const FORM_VACIO = { nombre: "", ciudad: "" };

export default function FormNuevoSitio({ ciudades, ciudadesFallaron, onReintentarCiudades, onCreado, onSesionVencida, nombreRef }) {
  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [exito, setExito] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // En la beta solo hay una ciudad (Cartagena): si es la única, ya va elegida.
  const ciudadElegida = form.ciudad || (ciudades.length === 1 ? String(ciudades[0].id) : "");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Al corregir un campo, se quita su aviso.
    setErrores((prev) => ({ ...prev, [name]: undefined }));
    setExito(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    // "Crear sitio" no usa disabled mientras guarda (usa aria-disabled) para no
    // perder el foco: si vence la sesión, el foco vuelve ahí al entrar de nuevo.
    if (enviando) return;
    setExito(null);
    setErrorGeneral(null);

    const locales = {};
    if (!form.nombre.trim()) locales.nombre = "Escribe el nombre del sitio.";
    if (!ciudadElegida) locales.ciudad = "Elige una ciudad.";
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setEnviando(true);
    try {
      const creado = await crearSitio({ nombre: form.nombre.trim(), ciudad: Number(ciudadElegida) });
      setForm(FORM_VACIO);
      setExito(`Se creó "${creado.nombre}".`);
      onCreado(creado);
    } catch (err) {
      if (err.status === 400) {
        const { campos, general } = erroresDesdeApi(err.body, CAMPOS);
        setErrores(campos);
        setErrorGeneral(general);
      } else if (err.status === 401) {
        onSesionVencida();
      } else if (err.status === 403) {
        setErrorGeneral("No tienes permiso para crear sitios.");
      } else {
        setErrorGeneral("No pudimos hablar con el servidor. Inténtalo de nuevo.");
      }
    } finally {
      setEnviando(false);
    }
  }

  const errorCiudad = errores.ciudad;

  return (
    <form className="sitios-form" aria-labelledby="sitios-form-titulo" noValidate onSubmit={handleSubmit}>
      <h2 id="sitios-form-titulo" className="sitios-form__titulo">Nuevo sitio</h2>

      <Campo
        ref={nombreRef}
        id="sitio-nombre"
        etiqueta="Nombre"
        name="nombre"
        type="text"
        placeholder="Ej. Hotel Bocagrande"
        autoComplete="off"
        value={form.nombre}
        onChange={handleChange}
        error={errores.nombre}
      />

      {/* Campo solo pinta <input>: el <select> se arma con sus mismas clases, como en ClienteForm. */}
      <div className={["campo", errorCiudad && "campo--error"].filter(Boolean).join(" ")}>
        <label className="campo__etiqueta" htmlFor="sitio-ciudad">Ciudad</label>
        <select
          id="sitio-ciudad"
          name="ciudad"
          className="campo__input"
          value={ciudadElegida}
          onChange={handleChange}
          aria-invalid={errorCiudad ? true : undefined}
          aria-describedby={errorCiudad ? "sitio-ciudad-error" : undefined}
        >
          <option value="">{ciudades.length ? "Elige una ciudad" : "Sin ciudades cargadas"}</option>
          {ciudades.map((ciudad) => (
            <option key={ciudad.id} value={ciudad.id}>{ciudad.nombre}</option>
          ))}
        </select>
        {errorCiudad && <p id="sitio-ciudad-error" className="campo__error">{errorCiudad}</p>}
        {ciudadesFallaron && (
          <p className="sitios-form__aviso">
            No se pudieron cargar las ciudades.{" "}
            <button type="button" className="sitios-form__reintentar" onClick={onReintentarCiudades}>
              Reintentar
            </button>
          </p>
        )}
      </div>

      {errorGeneral && <p className="sitios-form__error" role="alert">{errorGeneral}</p>}
      {exito && <p className="sitios-form__exito" role="status">{exito}</p>}

      <Boton type="submit" aria-disabled={enviando || undefined} className="sitios-form__crear">
        {enviando ? "Creando…" : "Crear sitio"}
      </Boton>
      <p className="sitios-form__nota">Solo los administradores pueden crear sitios.</p>
    </form>
  );
}
