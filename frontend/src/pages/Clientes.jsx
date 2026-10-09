import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  listarClientes,
  crearCliente,
  listarEmpresas,
  actualizarCliente,
  darDeBajaCliente,
} from "../api/clientes";
import ClienteForm, {
  FORM_VACIO,
  formDesdeCliente,
  nitDeEmpresa,
  erroresDesdeApi,
  payloadEdicion,
} from "./ClienteForm";
import "../styles/clientes.css";

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
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const navigate = useNavigate();

  // Un solo modal de formulario para crear y editar: { modo: "crear" | "editar", cliente? }.
  const [modalForm, setModalForm] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [verCliente, setVerCliente] = useState(null);
  const [bajaCliente, setBajaCliente] = useState(null);
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorAccion, setErrorAccion] = useState(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [mostrarInactivos]);

  function cerrarSesionExpirada() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    navigate("/login");
  }

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
        cerrarSesionExpirada();
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

  // Identificación propia del cliente; si no tiene (p. ej. jurídica del registro
  // público), el NIT de su empresa.
  function obtenerIdentificacion(c) {
    return c.identificacion || nitDeEmpresa(empresas, c.empresa) || "—";
  }

  const clientesFiltrados = useMemo(() => {
    if (filtroTipo === "todos") return clientes;
    return clientes.filter((c) => c.tipo === filtroTipo);
  }, [clientes, filtroTipo]);

  function abrirModalForm(modo, cliente) {
    setForm(cliente ? formDesdeCliente(cliente) : FORM_VACIO);
    setErroresCampo({});
    setErrorAccion(null);
    setModalForm({ modo, cliente });
  }

  function abrirBaja(c) {
    setErrorAccion(null);
    setBajaCliente(c);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErroresCampo((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmitForm(e) {
    e.preventDefault();
    const esCrear = modalForm.modo === "crear";
    setErroresCampo({});
    setErrorAccion(null);

    if (esCrear && form.tipo === "natural" && !form.identificacion.trim()) {
      setErroresCampo({ identificacion: "La identificación es obligatoria para personas naturales." });
      return;
    }

    setProcesando(true);
    try {
      if (esCrear) {
        await crearCliente({
          ...form,
          identificacion: form.identificacion.trim(),
          empresa: form.empresa ? Number(form.empresa) : undefined,
        });
      } else {
        await actualizarCliente(modalForm.cliente.id, payloadEdicion(form));
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
        setErrorAccion(`No tienes permisos suficientes para ${esCrear ? "registrar" : "editar"} clientes.`);
      } else if (err.status === 404) {
        setErrorAccion("Este cliente ya no existe. Cierra y actualiza la lista.");
      } else {
        setErrorAccion(`Error inesperado en el servidor al ${esCrear ? "registrar el cliente" : "guardar los cambios"}.`);
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
        <button type="button" className="btn btn--primary" onClick={() => abrirModalForm("crear")}>
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
                <td>{obtenerIdentificacion(c)}</td>
                <td>{c.telefono || "—"}</td>
                <td>{c.correo || "—"}</td>
                <td>{c.empresa ? obtenerNombreEmpresa(c.empresa) : "—"}</td>
                <td className="clientes-table__acciones">
                  <div className="clientes-acciones">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setVerCliente(c)}>
                      Ver
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => abrirModalForm("editar", c)}>
                      Editar
                    </button>
                    {c.activo && (
                      <button type="button" className="btn btn--danger btn--sm" onClick={() => abrirBaja(c)}>
                        Dar de baja
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {clientesFiltrados.length === 0 && (
              <tr><td colSpan="7">No hay clientes que coincidan con el filtro.</td></tr>
            )}
          </tbody>
        </table>
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
              <dt>{verCliente.tipo === "juridica" ? "NIT" : "Identificación"}</dt>
              <dd>{obtenerIdentificacion(verCliente)}</dd>
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

      {modalForm && (
        <div className="modal-overlay" onClick={() => !procesando && setModalForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>{modalForm.modo === "crear" ? "Nuevo cliente" : "Editar cliente"}</h3>
              <button type="button" className="modal__close" onClick={() => setModalForm(null)}>×</button>
            </div>

            <form onSubmit={handleSubmitForm} noValidate>
              <ClienteForm
                idPrefix={modalForm.modo}
                form={form}
                errores={erroresCampo}
                empresas={empresas}
                onChange={handleChange}
              />

              {errorAccion && <p className="form-error">Error: {errorAccion}</p>}

              <div className="form-actions">
                <button type="button" className="btn btn--ghost" onClick={() => setModalForm(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={procesando}>
                  {procesando ? "Guardando..." : modalForm.modo === "crear" ? "Guardar" : "Guardar cambios"}
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