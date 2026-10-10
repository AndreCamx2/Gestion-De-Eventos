import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  listarConceptos,
  crearConcepto,
  actualizarConcepto,
  cambiarEstadoConcepto,
  historialConcepto,
  listarSitios,
} from "../api/conceptos";
import ConceptoForm, {
  FORM_VACIO,
  formDesdeConcepto,
  formatCOP,
  precioConImpuesto,
  etiquetaImpuesto,
  validarForm,
  payloadCreacion,
  payloadEdicion,
  erroresDesdeApi,
} from "./ConceptoForm";
import "../styles/clientes.css";
import "../styles/conceptos.css";

export default function Conceptos() {
  const [conceptos, setConceptos] = useState([]);
  const [sitios, setSitios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtroSitio, setFiltroSitio] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const navigate = useNavigate();

  const [modalForm, setModalForm] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorAccion, setErrorAccion] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const [verConcepto, setVerConcepto] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState(null);

  const [cambioEstado, setCambioEstado] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  function cerrarSesionExpirada() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    navigate("/login");
  }

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      const [conceptosData, sitiosData] = await Promise.all([
        listarConceptos(),
        listarSitios(),
      ]);
      setConceptos(conceptosData);
      setSitios(sitiosData);
    } catch (err) {
      if (err.status === 401) {
        cerrarSesionExpirada();
      } else if (err.status === 403) {
        setError("No tienes permisos para consultar el catálogo de conceptos.");
      } else {
        setError("Error al comunicarse con el servidor. Intenta de nuevo.");
      }
    } finally {
      setCargando(false);
    }
  }

  function obtenerNombreSitio(id) {
    const sitio = sitios.find((s) => s.id === id);
    return sitio ? sitio.nombre : `Sitio #${id}`;
  }

  const conceptosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return conceptos
      .filter((c) => mostrarInactivos || c.activo)
      .filter((c) => filtroSitio === "todos" || String(c.sitio) === filtroSitio)
      .filter((c) => !texto || c.nombre.toLowerCase().includes(texto))
      .sort(
        (a, b) =>
          obtenerNombreSitio(a.sitio).localeCompare(
            obtenerNombreSitio(b.sitio),
            "es",
          ) || a.nombre.localeCompare(b.nombre, "es"),
      );
  }, [conceptos, sitios, filtroSitio, busqueda, mostrarInactivos]);

  function abrirModalForm(modo, concepto) {
    if (concepto) {
      setForm(formDesdeConcepto(concepto));
    } else {
      const sitioInicial =
        filtroSitio !== "todos"
          ? filtroSitio
          : sitios.length === 1
            ? String(sitios[0].id)
            : "";
      setForm({ ...FORM_VACIO, sitio: sitioInicial });
    }
    setErroresCampo({});
    setErrorAccion(null);
    setModalForm({ modo, concepto });
  }

  async function abrirVer(concepto) {
    setVerConcepto(concepto);
    setHistorial([]);
    setErrorHistorial(null);
    setCargandoHistorial(true);
    try {
      setHistorial(await historialConcepto(concepto.id));
    } catch (err) {
      if (err.status === 401) {
        cerrarSesionExpirada();
      } else {
        setErrorHistorial("No se pudo cargar el historial de precios.");
      }
    } finally {
      setCargandoHistorial(false);
    }
  }

  function abrirCambioEstado(concepto) {
    setErrorAccion(null);
    setCambioEstado({ concepto, activar: !concepto.activo });
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErroresCampo((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmitForm(e) {
    e.preventDefault();
    const esCrear = modalForm.modo === "crear";
    setErrorAccion(null);

    const erroresLocales = validarForm(form);
    setErroresCampo(erroresLocales);
    if (Object.keys(erroresLocales).length > 0) return;

    setProcesando(true);
    try {
      if (esCrear) {
        await crearConcepto(payloadCreacion(form));
      } else {
        await actualizarConcepto(modalForm.concepto.id, payloadEdicion(form));
      }
      setModalForm(null);
      await cargarDatos();
    } catch (err) {
      if (err.status === 400 && err.body && typeof err.body === "object") {
        // Los errores por campo se muestran junto a su input; el resto, abajo.
        const { campos, general } = erroresDesdeApi(err.body);
        setErroresCampo(campos);
        setErrorAccion(general);
      } else if (err.status === 401) {
        cerrarSesionExpirada();
      } else if (err.status === 403) {
        setErrorAccion(
          `No tienes permisos suficientes para ${esCrear ? "crear" : "editar"} conceptos.`,
        );
      } else if (err.status === 404) {
        setErrorAccion(
          "Este concepto ya no existe. Cierra y actualiza la lista.",
        );
      } else {
        setErrorAccion(
          `Error inesperado en el servidor al ${esCrear ? "crear el concepto" : "guardar los cambios"}.`,
        );
      }
    } finally {
      setProcesando(false);
    }
  }

  async function handleConfirmarCambioEstado() {
    const { concepto, activar } = cambioEstado;
    setErrorAccion(null);
    setProcesando(true);
    try {
      await cambiarEstadoConcepto(concepto.id, activar);
      setCambioEstado(null);
      await cargarDatos();
    } catch (err) {
      if (err.status === 401) {
        cerrarSesionExpirada();
      } else if (err.status === 403) {
        setErrorAccion(
          `No tienes permisos suficientes para ${activar ? "reactivar" : "desactivar"} conceptos.`,
        );
      } else if (err.status === 404) {
        setErrorAccion(
          "Este concepto ya no existe. Cierra y actualiza la lista.",
        );
      } else {
        setErrorAccion(
          `Error inesperado en el servidor al ${activar ? "reactivar" : "desactivar"} el concepto.`,
        );
      }
    } finally {
      setProcesando(false);
    }
  }

  // Aviso al editar: el cambio de precio queda registrado en el historial.
  const cambiaPrecio =
    modalForm?.modo === "editar" &&
    form.precio !== "" &&
    Number(form.precio) !== Number(modalForm.concepto.precio);

  return (
    <div className="clientes conceptos">
      <div className="toolbar">
        <h2>Catálogo de conceptos</h2>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => abrirModalForm("crear")}
        >
          + Nuevo concepto
        </button>
      </div>

      <div className="toolbar toolbar--filters conceptos-filtros">
        <label className="filter">
          <span>Sitio:</span>
          <select
            value={filtroSitio}
            onChange={(e) => setFiltroSitio(e.target.value)}
          >
            <option value="todos">Todos</option>
            {sitios.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="filter">
          <span>Buscar:</span>
          <input
            type="search"
            className="conceptos-buscar"
            placeholder="Nombre del concepto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
        <label className="filter">
          <input
            type="checkbox"
            checked={mostrarInactivos}
            onChange={(e) => setMostrarInactivos(e.target.checked)}
          />
          <span>Mostrar inactivos</span>
        </label>
      </div>

      {cargando && <p>Cargando conceptos...</p>}
      {error && <p className="clientes-error">Error: {error}</p>}

      {!cargando && !error && (
        <table className="conceptos-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Sitio</th>
              <th className="num">Precio</th>
              <th className="num">Impuesto</th>
              <th className="num">Precio + imp.</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {conceptosFiltrados.map((c) => (
              <tr
                key={c.id}
                className={c.activo ? "" : "clientes-table__row--inactivo"}
              >
                <td>
                  {c.nombre}
                  {!c.activo && (
                    <span className="clientes-badge--inactivo">Inactivo</span>
                  )}
                </td>
                <td>{obtenerNombreSitio(c.sitio)}</td>
                <td className="num">{formatCOP(c.precio)}</td>
                <td className="num">{etiquetaImpuesto(c.impuesto_pct)}</td>
                <td className="num">
                  {formatCOP(precioConImpuesto(c.precio, c.impuesto_pct))}
                </td>
                <td className="clientes-table__acciones">
                  <div className="clientes-acciones">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => abrirVer(c)}
                    >
                      Ver
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => abrirModalForm("editar", c)}
                    >
                      Editar
                    </button>
                    {c.activo ? (
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        onClick={() => abrirCambioEstado(c)}
                      >
                        Desactivar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--gold btn--sm"
                        onClick={() => abrirCambioEstado(c)}
                      >
                        Reactivar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {conceptosFiltrados.length === 0 && (
              <tr>
                <td colSpan="6">
                  {conceptos.length === 0
                    ? "Aún no hay conceptos registrados."
                    : "No hay conceptos que coincidan con los filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {verConcepto && (
        <div className="modal-overlay" onClick={() => setVerConcepto(null)}>
          <div
            className="modal modal--ancho"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__header">
              <h3>
                {verConcepto.nombre}
                {!verConcepto.activo && (
                  <span className="clientes-badge--inactivo">Inactivo</span>
                )}
              </h3>
              <button
                type="button"
                className="modal__close"
                onClick={() => setVerConcepto(null)}
              >
                ×
              </button>
            </div>

            <dl className="detalle">
              <dt>Sitio</dt>
              <dd>{obtenerNombreSitio(verConcepto.sitio)}</dd>
              <dt>Precio</dt>
              <dd>{formatCOP(verConcepto.precio)}</dd>
              <dt>Impuesto</dt>
              <dd>{etiquetaImpuesto(verConcepto.impuesto_pct)}</dd>
              <dt>Precio con impuesto</dt>
              <dd>
                {formatCOP(
                  precioConImpuesto(
                    verConcepto.precio,
                    verConcepto.impuesto_pct,
                  ),
                )}
              </dd>
              <dt>Estado</dt>
              <dd>{verConcepto.activo ? "Activo" : "Inactivo"}</dd>
            </dl>

            <h4>Historial de precios</h4>
            {cargandoHistorial ? (
              <p>Cargando historial...</p>
            ) : errorHistorial ? (
              <p className="form-error">{errorHistorial}</p>
            ) : historial.length ? (
              <table className="clientes-table clientes-table--compacta">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="num">Anterior</th>
                    <th className="num">Nuevo</th>
                    <th>Modificado por</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((h) => (
                    <tr key={h.id}>
                      <td>
                        {new Date(h.fecha_modificacion).toLocaleString(
                          "es-CO",
                          {
                            dateStyle: "short",
                            timeStyle: "short",
                          },
                        )}
                      </td>
                      <td className="num">{formatCOP(h.precio_anterior)}</td>
                      <td className="num">{formatCOP(h.precio_nuevo)}</td>
                      <td>{h.modificado_por}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>
                El precio de este concepto no ha cambiado desde que se creó.
              </p>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setVerConcepto(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalForm && (
        <div
          className="modal-overlay"
          onClick={() => !procesando && setModalForm(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>
                {modalForm.modo === "crear"
                  ? "Nuevo concepto"
                  : "Editar concepto"}
              </h3>
              <button
                type="button"
                className="modal__close"
                onClick={() => setModalForm(null)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitForm} noValidate>
              <ConceptoForm
                idPrefix={modalForm.modo}
                form={form}
                errores={erroresCampo}
                sitios={sitios}
                onChange={handleChange}
                esEdicion={modalForm.modo === "editar"}
              />

              {cambiaPrecio && (
                <p className="conceptos-aviso">
                  El precio cambia de {formatCOP(modalForm.concepto.precio)} a{" "}
                  {formatCOP(form.precio)}. El cambio quedará registrado en el
                  historial.
                </p>
              )}

              {errorAccion && (
                <p className="form-error">Error: {errorAccion}</p>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setModalForm(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={procesando}
                >
                  {procesando
                    ? "Guardando..."
                    : modalForm.modo === "crear"
                      ? "Guardar"
                      : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cambioEstado && (
        <div
          className="modal-overlay"
          onClick={() => !procesando && setCambioEstado(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>
                {cambioEstado.activar
                  ? "Reactivar concepto"
                  : "Desactivar concepto"}
              </h3>
              <button
                type="button"
                className="modal__close"
                onClick={() => setCambioEstado(null)}
              >
                ×
              </button>
            </div>

            {cambioEstado.activar ? (
              <p>
                ¿Reactivar <strong>{cambioEstado.concepto.nombre}</strong>?
                Volverá a estar disponible para nuevas cotizaciones con su
                precio actual de {formatCOP(cambioEstado.concepto.precio)}.
              </p>
            ) : (
              <p>
                ¿Desactivar <strong>{cambioEstado.concepto.nombre}</strong>?
                Dejará de ofrecerse en nuevas cotizaciones. El concepto y su
                historial de precios se conservan, y puedes reactivarlo cuando
                quieras.
              </p>
            )}

            {errorAccion && <p className="form-error">Error: {errorAccion}</p>}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setCambioEstado(null)}
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`btn ${cambioEstado.activar ? "btn--primary" : "btn--danger"}`}
                onClick={handleConfirmarCambioEstado}
                disabled={procesando}
              >
                {procesando
                  ? "Procesando..."
                  : cambioEstado.activar
                    ? "Reactivar"
                    : "Desactivar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
