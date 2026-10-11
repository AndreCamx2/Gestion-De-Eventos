import { useState, useEffect, useCallback } from "react";
import { listarSitios, crearSitio, listarCiudades } from "../../api/sitios";
import "../../styles/sitios.css";

const FORM_INICIAL = { nombre: "", ciudad: "" };

// Texto que se muestra para una ciudad del catálogo.
function etiquetaCiudad(ciudad) {
  return ciudad.nombre ?? ciudad.codigo ?? String(ciudad.id);
}

// El API de sitios devuelve la ciudad como id (clave primaria). Lo traducimos
// al nombre usando el catálogo; si no se encuentra, mostramos el valor tal cual.
function nombreCiudad(valor, ciudades) {
  if (valor && typeof valor === "object") return valor.nombre ?? valor.codigo ?? "—";
  const ciudad = ciudades.find((c) => c.id === valor || c.codigo === valor);
  return ciudad ? etiquetaCiudad(ciudad) : valor ?? "—";
}

// Traduce el error de apiFetch (error.status, error.body) a mensajes para el
// formulario. DRF responde los errores de validación como
// { campo: ["mensaje"] } y los demás como { detail: "mensaje" }.
function erroresDeServidor(error) {
  const campos = {};
  let general = "";

  if (error.status === 401) {
    general = "Tu sesión expiró. Vuelve a iniciar sesión.";
  } else if (error.status === 403) {
    general = "No tienes permiso para crear sitios.";
  } else if (error.body && typeof error.body === "object") {
    for (const [clave, valor] of Object.entries(error.body)) {
      const texto = Array.isArray(valor) ? valor.join(" ") : String(valor);
      if (clave === "detail" || clave === "non_field_errors") general = texto;
      else campos[clave] = texto;
    }
  }

  if (!general && Object.keys(campos).length === 0) {
    general = error.message || "No se pudo crear el sitio.";
  }
  return { campos, general };
}

export default function Sitios() {
  const [sitios, setSitios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorLista, setErrorLista] = useState("");

  const [ciudades, setCiudades] = useState([]);
  const [errorCiudades, setErrorCiudades] = useState("");

  const [form, setForm] = useState(FORM_INICIAL);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [exito, setExito] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargarSitios = useCallback(async () => {
    setCargando(true);
    setErrorLista("");
    try {
      setSitios(await listarSitios());
    } catch (error) {
      setErrorLista(error.message || "No se pudieron cargar los sitios.");
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarCiudades = useCallback(async () => {
    setErrorCiudades("");
    try {
      setCiudades(await listarCiudades());
    } catch (error) {
      setErrorCiudades(error.message || "No se pudieron cargar las ciudades.");
    }
  }, []);

  useEffect(() => {
    cargarSitios();
    cargarCiudades();
  }, [cargarSitios, cargarCiudades]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Al corregir un campo, quitamos su aviso de error.
    setErrores((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setExito("");
    setErrorGeneral("");

    const nuevos = {};
    if (!form.nombre.trim()) nuevos.nombre = "El nombre del sitio es obligatorio.";
    if (!form.ciudad) nuevos.ciudad = "Selecciona una ciudad.";
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    // El select entrega texto; el API espera el id como número.
    const idCiudad = Number(form.ciudad);

    setEnviando(true);
    try {
      await crearSitio({
        nombre: form.nombre.trim(),
        ciudad: Number.isNaN(idCiudad) ? form.ciudad : idCiudad,
      });
      setForm(FORM_INICIAL);
      setExito("Sitio creado correctamente.");
      await cargarSitios(); // refresca la lista con lo que quedó guardado
    } catch (error) {
      const { campos, general } = erroresDeServidor(error);
      setErrores(campos);
      setErrorGeneral(general);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="sitios">
      <section className="sitios__panel">
        <div className="sitios__encabezado">
          <h2 className="sitios__titulo">Sitios registrados</h2>
          {!cargando && !errorLista && (
            <span className="sitios__contador">{sitios.length}</span>
          )}
        </div>

        {cargando && <p className="sitios__estado">Cargando sitios…</p>}

        {errorLista && (
          <div className="sitios__alerta sitios__alerta--error" role="alert">
            <span>{errorLista}</span>
            <button type="button" className="sitios__reintentar" onClick={cargarSitios}>
              Reintentar
            </button>
          </div>
        )}

        {!cargando && !errorLista && sitios.length === 0 && (
          <p className="sitios__estado">
            Aún no hay sitios registrados. Crea el primero con el formulario.
          </p>
        )}

        {!cargando && !errorLista && sitios.length > 0 && (
          <div className="sitios__tabla-wrap">
            <table className="sitios__tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Ciudad</th>
                </tr>
              </thead>
              <tbody>
                {sitios.map((sitio) => (
                  <tr key={sitio.id}>
                    <td className="sitios__nombre">{sitio.nombre}</td>
                    <td>{nombreCiudad(sitio.ciudad, ciudades)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside className="sitios__panel">
        <h2 className="sitios__titulo">Nuevo sitio</h2>

        {exito && (
          <div className="sitios__alerta sitios__alerta--exito" role="status">
            {exito}
          </div>
        )}
        {errorGeneral && (
          <div className="sitios__alerta sitios__alerta--error" role="alert">
            {errorGeneral}
          </div>
        )}

        <form noValidate onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="nombre">
              Nombre <span className="field__required">*</span>
            </label>
            <div className="field__control">
              <input
                className="field__input"
                type="text"
                id="nombre"
                name="nombre"
                placeholder="Hotel Las Américas"
                value={form.nombre}
                onChange={handleChange}
              />
            </div>
            {errores.nombre && <p className="field__error">{errores.nombre}</p>}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="ciudad">
              Ciudad <span className="field__required">*</span>
            </label>
            <div className="field__control">
              <select
                className="field__input"
                id="ciudad"
                name="ciudad"
                value={form.ciudad}
                onChange={handleChange}
              >
                <option value="">Selecciona una ciudad</option>
                {ciudades.map((c) => (
                  <option key={c.id} value={c.id}>
                    {etiquetaCiudad(c)}
                  </option>
                ))}
              </select>
            </div>
            {errorCiudades && (
              <p className="field__error">
                {errorCiudades}{" "}
                <button type="button" className="sitios__reintentar" onClick={cargarCiudades}>
                  Reintentar
                </button>
              </p>
            )}
            {errores.ciudad && <p className="field__error">{errores.ciudad}</p>}
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={enviando}
          >
            {enviando ? "Guardando…" : "Crear sitio"}
          </button>
        </form>
      </aside>
    </div>
  );
}