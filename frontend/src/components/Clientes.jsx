import { useState, useEffect } from "react";
import { listarClientes, crearCliente } from "../api/clientes";
import "../styles/clientes.css";

// Temporal: mientras no exista un endpoint para listar empresas (SGDE-11,
// pendiente de Andrés), usamos esta lista fija. La empresa "Eventos XYZ S.A.S"
// ya existe en la base de datos (id: 1), creada manualmente en /admin/ para pruebas.
const EMPRESAS_TEMP = [
  { id: 1, nombre: "Eventos XYZ S.A.S" },
];
function nombreEmpresa(id) {
  const empresa = EMPRESAS_TEMP.find((e) => e.id === id);
  return empresa ? empresa.nombre : "—";
}

const FORM_INICIAL = {
  tipo: "natural",
  nombre: "",
  identificacion: "",
  empresa: "",
};

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState(null);

  useEffect(() => {
    cargarClientes();
  }, []);

  async function cargarClientes() {
    setCargando(true);
    setError(null);
    try {
      const data = await listarClientes();
      setClientes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

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
        empresa: form.empresa ? Number(form.empresa) : undefined,
      });
      setModalAbierto(false);
      await cargarClientes();
    } catch (err) {
      setErrorForm(err.message);
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

      {cargando && <p>Cargando clientes...</p>}
      {error && <p className="clientes-error">Error: {error}</p>}

      {!cargando && !error && (
        <table className="clientes-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Identificación</th>
              <th>Empresa</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id}>
                <td>{c.nombre}</td>
                <td>{c.tipo === "juridica" ? "Jurídica" : "Natural"}</td>
                <td>{c.identificacion || "—"}</td>
                <td>{c.empresa ? nombreEmpresa(c.empresa) : "—"}</td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr><td colSpan="4">No hay clientes registrados todavía.</td></tr>
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
                    {EMPRESAS_TEMP.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

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