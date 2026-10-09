import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  listarClientes,
  crearCliente,
  listarEmpresas,
  actualizarCliente,
  darDeBajaCliente,
} from "../api/clientes";
import "../styles/clientes.css";

const FORM_INICIAL = {
  tipo: "natural",
  nombre: "",
  identificacion: "",
  telefono: "",
  correo: "",
  empresa: "",
};

const FORM_EDICION_VACIO = {
  tipo: "natural",
  nombre: "",
  identificacion: "",
  telefono: "",
  correo: "",
  empresa: "",
  forma_pago: "",
  observaciones_internas: "",
};

function formDesdeCliente(c) {
  return {
    tipo: c.tipo,
    nombre: c.nombre ?? "",
    identificacion: c.identificacion ?? "",
    telefono: c.telefono ?? "",
    correo: c.correo ?? "",
    empresa: c.empresa ? String(c.empresa) : "",
    forma_pago: c.forma_pago ?? "",
    observaciones_internas: c.observaciones_internas ?? "",
  };
}

const ETIQUETAS_CAMPO = {
  tipo: "Tipo",
  nombre: "Nombre",
  identificacion: "Identificación",
  telefono: "Teléfono",
  correo: "Correo",
  empresa: "Empresa",
  forma_pago: "Forma de pago",
  observaciones_internas: "Observaciones internas",
};

const textoError = (e) => (Array.isArray(e) ? e.join(" ") : String(e));

const FILTROS_TIPO = [
  { value: "todos", label: "Todos" },
  { value: "natural", label: "Persona natural" },
  { value: "juridica", label: "Jurídica" },
];

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState(null);
  const navigate = useNavigate();

  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  // Cliente sobre el que se abrió un modal de ver / editar / baja (null = ninguno).
  const [verCliente, setVerCliente] = useState(null);
  const [editarCliente, setEditarCliente] = useState(null);
  const [bajaCliente, setBajaCliente] = useState(null);
  const [formEdicion, setFormEdicion] = useState(FORM_EDICION_VACIO);
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorAccion, setErrorAccion] = useState(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [mostrarInactivos]);

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      const [clientesData, empresasData] = await Promise.all([
        listarClientes({ incluirInactivos: mostrarInactivos }),
        listarEmpresas(),
      ]);
      setClientes(clientesData);
      setEmpresas(empresasData);
    } catch (err) {
      if (err.status === 401) {
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("refresh_token");
        navigate("/login");
      } else if (err.status === 403) {
        setError("No tienes permisos para consultar los clientes o empresas.");
      } else {
        setError("Error al comunicarse con el servidor. Intenta de nuevo.");
      }
    } finally {
      setCargando(false);
    }
  }

  function obtenerNombreEmpresa(id) {
    if (!id) return "—";
    const emp = empresas.find((e) => e.id === id);
    return emp ? emp.razon_social : `Empresa #${id}`;
  }

  const clientesFiltrados = useMemo(() => {
    if (filtroTipo === "todos") return clientes;
    return clientes.filter((c) => c.tipo === filtroTipo);
  }, [clientes, filtroTipo]);

  function abrirModal() {
    setForm(FORM_INICIAL);
    setErrorForm(null);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorForm(null);
    setGuardando(true);
    try {
      await crearCliente({
        tipo: form.tipo,
        nombre: form.nombre,
        identificacion: form.identificacion,
        telefono: form.telefono,
        correo: form.correo,
        empresa: form.empresa ? Number(form.empresa) : undefined,
      });
      setModalAbierto(false);
      await cargarDatos();
    } catch (err) {
      if (err.status === 400) {
        if (err.body && typeof err.body === "object") {
          if (err.body.detail) {
            setErrorForm(err.body.detail);
          } else {
            const mensajes = Object.entries(err.body)
              .map(([campo, errores]) => `${campo}: ${Array.isArray(errores) ? errores.join(", ") : errores}`)
              .join(" | ");
            setErrorForm(mensajes || "Datos inválidos en el formulario.");
          }
        } else {
          setErrorForm("Datos inválidos en el formulario.");
        }
      } else if (err.status === 401) {
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("refresh_token");
        navigate("/login");
      } else if (err.status === 403) {
        setErrorForm("No tienes permisos suficientes para registrar clientes.");
      } else {
        setErrorForm("Error inesperado en el servidor al registrar cliente.");
      }
    } finally {
      setGuardando(false);
    }
  }

  function cerrarSesionExpirada() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    navigate("/login");
  }

  function abrirEdicion(c) {
    setFormEdicion(formDesdeCliente(c));
    setErroresCampo({});
    setErrorAccion(null);
    setEditarCliente(c);
  }

  function abrirBaja(c) {
    setErrorAccion(null);
    setBajaCliente(c);
  }

  function handleChangeEdicion(e) {
    const { name, value } = e.target;
    setFormEdicion((prev) => ({ ...prev, [name]: value }));
    setErroresCampo((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleGuardarEdicion(e) {
    e.preventDefault();
    setErroresCampo({});
    setErrorAccion(null);
    setProcesando(true);
    try {
      await actualizarCliente(editarCliente.id, {
        tipo: formEdicion.tipo,
        nombre: formEdicion.nombre,
        // El API tiene unique en identificacion: un "" chocaría con otros vacíos, se envía null.
        identificacion: formEdicion.identificacion.trim() || null,
        telefono: formEdicion.telefono,
        correo: formEdicion.correo,
        empresa: formEdicion.empresa ? Number(formEdicion.empresa) : null,
        forma_pago: formEdicion.forma_pago,
        observaciones_internas: formEdicion.observaciones_internas,
      });
      setEditarCliente(null);
      await cargarDatos();
    } catch (err) {
      if (err.status === 400 && err.body && typeof err.body === "object") {
        // Los errores por campo se muestran junto a su input; el resto, abajo.
        const { detail, non_field_errors, ...porCampo } = err.body;
        const campos = {};
        const sueltos = [];
        Object.entries(porCampo).forEach(([campo, e2]) => {
          if (campo in ETIQUETAS_CAMPO) campos[campo] = textoError(e2);
          else sueltos.push(`${campo}: ${textoError(e2)}`);
        });
        if (detail) sueltos.push(textoError(detail));
        if (non_field_errors) sueltos.push(textoError(non_field_errors));
        setErroresCampo(campos);
        setErrorAccion(sueltos.join(" | ") || null);
      } else if (err.status === 401) {
        cerrarSesionExpirada();
      } else if (err.status === 403) {
        setErrorAccion("No tienes permisos suficientes para editar clientes.");
      } else if (err.status === 404) {
        setErrorAccion("Este cliente ya no existe. Cierra y actualiza la lista.");
      } else {
        setErrorAccion("Error inesperado en el servidor al guardar los cambios.");
      }
    } finally {
      setProcesando(false);
    }
  }

  async function handleConfirmarBaja() {
    setErrorAccion(null);
    setProcesando(true);
    try {
      await darDeBajaCliente(bajaCliente.id);
      setBajaCliente(null);
      await cargarDatos();
    } catch (err) {
      if (err.status === 401) {
        cerrarSesionExpirada();
      } else if (err.status === 403) {
        setErrorAccion("No tienes permisos suficientes para dar de baja clientes.");
      } else if (err.status === 404) {
        setErrorAccion("Este cliente ya no existe. Cierra y actualiza la lista.");
      } else {
        setErrorAccion("Error inesperado en el servidor al dar de baja.");
      }
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="clientes">
      <div className="toolbar">
        <h2>Directorio de clientes</h2>
        <button type="button" className="btn btn--primary" onClick={abrirModal}>
          + Nuevo cliente
        </button>
      </div>

      <div className="toolbar toolbar--filters">
        <label className="filter">
          <span>Tipo:</span>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            {FILTROS_TIPO.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </label>
        <label className="filter">
          <input
            type="checkbox"
            checked={mostrarInactivos}
            onChange={(e) => setMostrarInactivos(e.target.checked)}
          />
          <span>Mostrar dados de baja</span>
        </label>
      </div>

      {cargando && <p>Cargando clientes...</p>}
      {error && <p className="clientes-error">Error: {error}</p>}

      {!cargando && !error && (
        <table className="clientes-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Identificación</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Empresa</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((c) => (
              <tr key={c.id} className={c.activo ? "" : "clientes-table__row--inactivo"}>
                <td>
                  {c.nombre}
                  {!c.activo && <span className="clientes-badge--inactivo">Inactivo</span>}
                </td>
                <td>{c.tipo === "juridica" ? "Jurídica" : "Natural"}</td>
                <td>{c.identificacion || "—"}</td>
                <td>{c.telefono || "—"}</td>
                <td>{c.correo || "—"}</td>
                <td>{c.empresa ? obtenerNombreEmpresa(c.empresa) : "—"}</td>
                <td className="clientes-table__acciones">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setVerCliente(c)}>
                    Ver
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => abrirEdicion(c)}>
                    Editar
                  </button>
                  {c.activo && (
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => abrirBaja(c)}>
                      Dar de baja
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {clientesFiltrados.length === 0 && (
              <tr><td colSpan="7">No hay clientes que coincidan con el filtro.</td></tr>
            )}
          </tbody>
        </table>
      )}

      {modalAbierto && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Nuevo cliente</h3>
              <button type="button" className="modal__close" onClick={cerrarModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor="tipo">Tipo</label>
                <select id="tipo" name="tipo" value={form.tipo} onChange={handleChange}>
                  <option value="natural">Natural</option>
                  <option value="juridica">Jurídica</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="nombre">Nombre</label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  value={form.nombre}
                  onChange={handleChange}
                  required
                />
              </div>

              {form.tipo === "natural" && (
                <div className="form-field">
                  <label htmlFor="identificacion">Identificación</label>
                  <input
                    id="identificacion"
                    name="identificacion"
                    type="text"
                    value={form.identificacion}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}

              {form.tipo === "juridica" && (
                <div className="form-field">
                  <label htmlFor="empresa">Empresa</label>
                  <select id="empresa" name="empresa" value={form.empresa} onChange={handleChange} required>
                    <option value="">Selecciona una empresa...</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-field">
                <label htmlFor="telefono">Teléfono</label>
                <input
                  id="telefono"
                  name="telefono"
                  type="text"
                  value={form.telefono}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field">
                <label htmlFor="correo">Correo</label>
                <input
                  id="correo"
                  name="correo"
                  type="email"
                  value={form.correo}
                  onChange={handleChange}
                />
              </div>

              {errorForm && <p className="form-error">Error: {errorForm}</p>}

              <div className="form-actions">
                <button type="button" className="btn btn--ghost" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {verCliente && (
        <div className="modal-overlay" onClick={() => setVerCliente(null)}>
          <div className="modal modal--ancho" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>
                {verCliente.nombre}
                {!verCliente.activo && <span className="clientes-badge--inactivo">Inactivo</span>}
              </h3>
              <button type="button" className="modal__close" onClick={() => setVerCliente(null)}>×</button>
            </div>

            <dl className="detalle">
              <dt>Tipo</dt>
              <dd>{verCliente.tipo === "juridica" ? "Jurídica" : "Natural"}</dd>
              <dt>Identificación</dt>
              <dd>{verCliente.identificacion || "—"}</dd>
              <dt>Teléfono</dt>
              <dd>{verCliente.telefono || "—"}</dd>
              <dt>Correo</dt>
              <dd>{verCliente.correo || "—"}</dd>
              <dt>Empresa</dt>
              <dd>{verCliente.empresa ? obtenerNombreEmpresa(verCliente.empresa) : "—"}</dd>
              <dt>Forma de pago</dt>
              <dd>{verCliente.forma_pago || "—"}</dd>
              <dt>Observaciones internas</dt>
              <dd>{verCliente.observaciones_internas || "—"}</dd>
              <dt>Creado</dt>
              <dd>{new Date(verCliente.creado_en).toLocaleDateString("es-CO")}</dd>
            </dl>

            <h4>Cotizaciones</h4>
            {verCliente.cotizaciones?.length ? (
              <table className="clientes-table clientes-table--compacta">
                <thead>
                  <tr>
                    <th>N.º</th>
                    <th>Estado</th>
                    <th>Fecha del evento</th>
                    <th>Personas</th>
                  </tr>
                </thead>
                <tbody>
                  {verCliente.cotizaciones.map((q) => (
                    <tr key={q.id}>
                      <td>#{q.id}</td>
                      <td className="capitalizar">{q.estado}</td>
                      <td>{q.fecha_evento || "—"}</td>
                      <td>{q.cantidad_personas ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Este cliente aún no tiene cotizaciones.</p>
            )}

            <div className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setVerCliente(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {editarCliente && (
        <div className="modal-overlay" onClick={() => setEditarCliente(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Editar cliente</h3>
              <button type="button" className="modal__close" onClick={() => setEditarCliente(null)}>×</button>
            </div>

            <form onSubmit={handleGuardarEdicion} noValidate>
              <div className="form-field">
                <label htmlFor="ed-tipo">Tipo</label>
                <select id="ed-tipo" name="tipo" value={formEdicion.tipo} onChange={handleChangeEdicion}>
                  <option value="natural">Natural</option>
                  <option value="juridica">Jurídica</option>
                </select>
                {erroresCampo.tipo && <p className="field__error">{erroresCampo.tipo}</p>}
              </div>

              <div className="form-field">
                <label htmlFor="ed-nombre">Nombre</label>
                <input id="ed-nombre" name="nombre" type="text" value={formEdicion.nombre} onChange={handleChangeEdicion} />
                {erroresCampo.nombre && <p className="field__error">{erroresCampo.nombre}</p>}
              </div>

              <div className="form-field">
                <label htmlFor="ed-identificacion">Identificación</label>
                <input
                  id="ed-identificacion"
                  name="identificacion"
                  type="text"
                  value={formEdicion.identificacion}
                  onChange={handleChangeEdicion}
                />
                {erroresCampo.identificacion && <p className="field__error">{erroresCampo.identificacion}</p>}
              </div>

              <div className="form-field">
                <label htmlFor="ed-empresa">
                  Empresa{formEdicion.tipo === "juridica" ? " (obligatoria)" : ""}
                </label>
                <select id="ed-empresa" name="empresa" value={formEdicion.empresa} onChange={handleChangeEdicion}>
                  <option value="">{formEdicion.tipo === "juridica" ? "Selecciona una empresa..." : "Sin empresa"}</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                  ))}
                </select>
                {erroresCampo.empresa && <p className="field__error">{erroresCampo.empresa}</p>}
              </div>

              <div className="form-field">
                <label htmlFor="ed-telefono">Teléfono</label>
                <input id="ed-telefono" name="telefono" type="text" value={formEdicion.telefono} onChange={handleChangeEdicion} />
                {erroresCampo.telefono && <p className="field__error">{erroresCampo.telefono}</p>}
              </div>

              <div className="form-field">
                <label htmlFor="ed-correo">Correo</label>
                <input id="ed-correo" name="correo" type="email" value={formEdicion.correo} onChange={handleChangeEdicion} />
                {erroresCampo.correo && <p className="field__error">{erroresCampo.correo}</p>}
              </div>

              <div className="form-field">
                <label htmlFor="ed-forma_pago">Forma de pago</label>
                <input id="ed-forma_pago" name="forma_pago" type="text" value={formEdicion.forma_pago} onChange={handleChangeEdicion} />
                {erroresCampo.forma_pago && <p className="field__error">{erroresCampo.forma_pago}</p>}
              </div>

              <div className="form-field">
                <label htmlFor="ed-observaciones_internas">Observaciones internas</label>
                <textarea
                  id="ed-observaciones_internas"
                  name="observaciones_internas"
                  rows="3"
                  value={formEdicion.observaciones_internas}
                  onChange={handleChangeEdicion}
                />
                {erroresCampo.observaciones_internas && (
                  <p className="field__error">{erroresCampo.observaciones_internas}</p>
                )}
              </div>

              {errorAccion && <p className="form-error">Error: {errorAccion}</p>}

              <div className="form-actions">
                <button type="button" className="btn btn--ghost" onClick={() => setEditarCliente(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={procesando}>
                  {procesando ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {bajaCliente && (
        <div className="modal-overlay" onClick={() => !procesando && setBajaCliente(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Dar de baja</h3>
              <button type="button" className="modal__close" onClick={() => setBajaCliente(null)}>×</button>
            </div>

            <p>
              ¿Dar de baja a <strong>{bajaCliente.nombre}</strong>? El cliente dejará de aparecer en la lista y su
              usuario no podrá iniciar sesión. Sus datos y cotizaciones se conservan.
            </p>

            {errorAccion && <p className="form-error">Error: {errorAccion}</p>}

            <div className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setBajaCliente(null)} disabled={procesando}>
                Cancelar
              </button>
              <button type="button" className="btn btn--danger" onClick={handleConfirmarBaja} disabled={procesando}>
                {procesando ? "Procesando..." : "Dar de baja"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}