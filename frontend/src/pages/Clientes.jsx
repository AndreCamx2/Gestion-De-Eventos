import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { listarClientes, crearCliente, listarEmpresas } from "../api/clientes";
import "../styles/clientes.css";

const FORM_INICIAL = {
  tipo: "natural",
  nombre: "",
  identificacion: "",
  telefono: "",
  correo: "",
  empresa: "",
};

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

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      const [clientesData, empresasData] = await Promise.all([
        listarClientes(),
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
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((c) => (
              <tr key={c.id}>
                <td>{c.nombre}</td>
                <td>{c.tipo === "juridica" ? "Jurídica" : "Natural"}</td>
                <td>{c.identificacion || "—"}</td>
                <td>{c.telefono || "—"}</td>
                <td>{c.correo || "—"}</td>
                <td>{c.empresa ? obtenerNombreEmpresa(c.empresa) : "—"}</td>
              </tr>
            ))}
            {clientesFiltrados.length === 0 && (
              <tr><td colSpan="6">No hay clientes que coincidan con el filtro.</td></tr>
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
                <button type="button" className="btn btn--outline" onClick={cerrarModal}>
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
    </div>
  );
}