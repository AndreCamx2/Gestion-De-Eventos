import { useState } from "react";
import { Link } from "react-router-dom";
import { crearSalon } from "../../api/salones";
import { erroresDesdeApi } from "../../utils/erroresApi";
import { Boton, Campo, Dialogo, cerrarDialogoDe } from "../../components/ui";
import { AvisoSesionEnVentana } from "../../components/SesionVencida";

const CAMPOS = ["venue", "nombre", "ancho", "altura", "foto_url"];

// "Nuevo salón": POST /api/salones/ con venue, nombre, ancho, altura y foto_url.
// La foto es una URL (el API guarda URLs, nunca archivos).
// - sitios: lista de /api/sitios/ para el select.
// - onCreado(salon): recibe el salón que devolvió el API.
// - onSesionVencida(): 401 aunque se intentó renovar el token.
// - sesionVencida / onEntrarDeNuevo(evento): con la sesión vencida se muestra el
//   aviso dentro de la ventana; la ventana no se cierra y conserva lo escrito.
export default function NuevoSalonModal({
  sitios,
  onCreado,
  onCerrar,
  onSesionVencida,
  sesionVencida,
  onEntrarDeNuevo,
}) {
  // Con un solo sitio no hay nada que elegir: viene marcado.
  const [form, setForm] = useState(() => ({
    venue: sitios.length === 1 ? String(sitios[0].id) : "",
    nombre: "",
    ancho: "",
    altura: "",
    foto_url: "",
  }));
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [guardando, setGuardando] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrores((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorGeneral(null);

    const locales = {};
    if (!form.sitio) locales.sitio = "Elige el venue donde está el salón.";
    if (!form.nombre.trim()) locales.nombre = "Escribe el nombre del salón.";
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setGuardando(true);
    try {
      const creado = await crearSalon({ ...form, sitio: Number(form.sitio) });
      onCreado(creado);
    } catch (err) {
      if (err.status === 400 && err.body && typeof err.body === "object") {
        // La regla "nombre único por sitio" llega como non_field_errors, no en
        // "nombre": se muestra debajo del nombre, que es lo que hay que cambiar.
        const { non_field_errors, ...porCampo } = err.body;
        const { campos, general } = erroresDesdeApi(porCampo, CAMPOS);
        if (non_field_errors) campos.nombre = "Ya existe un salón con ese nombre en este venue.";
        setErrores(campos);
        setErrorGeneral(general);
      } else if (err.status === 401) {
        // La barra de abajo queda inerte mientras la ventana está abierta: el aviso
        // va dentro de la ventana (AvisoSesionEnVentana), que no se cierra.
        onSesionVencida();
      } else if (err.status === 403) {
        setErrorGeneral("No tienes permisos suficientes para crear salones.");
      } else {
        setErrorGeneral("Error inesperado en el servidor al crear el salón.");
      }
      setGuardando(false);
    }
  }

  const idSitio = "nuevo-salon-sitio";
  const sinSitios = sitios.length === 0;

  return (
    <Dialogo idTitulo="nuevo-salon-titulo" titulo="Nuevo salón" bloqueado={guardando} onCerrar={onCerrar}>
      <form className="dialogo__form" onSubmit={handleSubmit} noValidate>
        {/* Campo solo pinta <input>: el select usa sus mismas clases, como en ClienteForm. */}
        <div className={["campo", errores.sitio && "campo--error"].filter(Boolean).join(" ")}>
          <label className="campo__etiqueta" htmlFor={idSitio}>Venue</label>
          <select
            id={idSitio}
            name="sitio"
            className="campo__input"
            value={form.sitio}
            onChange={handleChange}
            disabled={sinSitios}
            aria-invalid={errores.sitio ? true : undefined}
            aria-describedby={errores.sitio ? `${idSitio}-error` : undefined}
          >
            <option value="">{sinSitios ? "No hay Venues" : "Elige un venue..."}</option>
            {sitios.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
          {errores.sitio && (
            <p id={`${idSitio}-error`} className="campo__error">{errores.sitio}</p>
          )}
          {sinSitios && (
            <p className="salones-dialogo__ayuda">
              Todo salón pertenece a un venue. Primero crea uno en <Link to="/sitios">Venues</Link>.
            </p>
          )}
        </div>

        <Campo
          id="nuevo-salon-nombre"
          etiqueta="Nombre"
          name="nombre"
          type="text"
          autoComplete="off"
          value={form.nombre}
          onChange={handleChange}
          error={errores.nombre}
        />

        <div className="salones-dialogo__par">
          <Campo
            id="nuevo-salon-ancho"
            etiqueta="Ancho (m)"
            name="ancho"
            type="text"
            inputMode="decimal"
            placeholder="Opcional"
            value={form.ancho}
            onChange={handleChange}
            error={errores.ancho}
          />
          <Campo
            id="nuevo-salon-altura"
            etiqueta="Altura (m)"
            name="altura"
            type="text"
            inputMode="decimal"
            placeholder="Opcional"
            value={form.altura}
            onChange={handleChange}
            error={errores.altura}
          />
        </div>

        <Campo
          id="nuevo-salon-foto"
          etiqueta="URL de la foto (opcional)"
          name="foto_url"
          type="url"
          inputMode="url"
          placeholder="https://..."
          value={form.foto_url}
          onChange={handleChange}
          error={errores.foto_url}
        />

        {sesionVencida && <AvisoSesionEnVentana onEntrar={onEntrarDeNuevo} />}
        {errorGeneral && (
          <p className="dialogo__error" role="alert">Error: {errorGeneral}</p>
        )}

        <div className="dialogo__acciones">
          <Boton variante="secundario" disabled={guardando} onClick={(e) => cerrarDialogoDe(e.currentTarget)}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="oscuro" disabled={guardando || sinSitios}>
            {guardando ? "Guardando..." : "Crear salón"}
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}
