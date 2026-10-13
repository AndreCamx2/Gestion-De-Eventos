import { useState, useEffect } from "react";
import {
  getProveedores,
  crearProveedor,
  eliminarProveedor,
} from "../api/proveedores";
import "../styles/proveedores.css";

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    servicio: "",
    contacto: "",
    email: "",
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    setLoading(true);
    try {
      const data = await getProveedores();
      setProveedores(Array.isArray(data) ? data : data.results || []);
      setError(null);
    } catch (err) {
      setError(err.message || "Error al cargar la lista de proveedores.");
    } finally {
      setLoading(false);
    }
  };

  const handleCrearProveedor = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSubmitting(true);

    try {
      await crearProveedor(form);
      setMostrarModal(false);
      setForm({ nombre: "", servicio: "", contacto: "", email: "" });
      cargarProveedores(); // Refrescar la lista
    } catch (err) {
      setFormError(err.message || "No se pudo guardar el proveedor.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Está seguro de eliminar este proveedor?")) return;

    try {
      await eliminarProveedor(id);
      cargarProveedores();
    } catch (err) {
      alert(err.message || "Error al eliminar el proveedor.");
    }
  };

  return (
    <div className="proveedores-container">
      <div className="toolbar">
        <h2>Gestión de Proveedores (RF-12)</h2>
        <button
          className="btn btn--primary"
          onClick={() => setMostrarModal(true)}
        >
          + Nuevo Proveedor
        </button>
      </div>

      {loading ? (
        <p className="state-info">Cargando proveedores desde el servidor...</p>
      ) : error ? (
        <p className="state-error">{error}</p>
      ) : (
        <table className="proveedores-table">
          <thead>
            <tr>
              <th>Nombre / Empresa</th>
              <th>Servicio / Montaje</th>
              <th>Contacto</th>
              <th>Correo Electrónico</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proveedores.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-empty">
                  No hay proveedores registrados.
                </td>
              </tr>
            ) : (
              proveedores.map((p) => (
                <tr key={p.id}>
                  <td className="cell-strong">{p.nombre}</td>
                  <td>{p.servicio || p.tipo_montaje || "General"}</td>
                  <td>{p.contacto || p.telefono}</td>
                  <td>{p.email || "N/A"}</td>
                  <td>
                    <button
                      className="btn-danger"
                      onClick={() => handleEliminar(p.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {mostrarModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Registrar Nuevo Proveedor</h3>
            {formError && <p className="form-error">{formError}</p>}
            <form onSubmit={handleCrearProveedor}>
              <label>
                Nombre del Proveedor / Empresa:
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </label>

              <label>
                Servicio o Tipo de Montaje:
                <input
                  type="text"
                  value={form.servicio}
                  onChange={(e) =>
                    setForm({ ...form, servicio: e.target.value })
                  }
                  placeholder="Ej. Mantelería, Amplificación, Sonido"
                />
              </label>

              <label>
                Teléfono de Contacto:
                <input
                  type="text"
                  value={form.contacto}
                  onChange={(e) =>
                    setForm({ ...form, contacto: e.target.value })
                  }
                  required
                />
              </label>

              <label>
                Correo Electrónico:
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  disabled={formSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? "Guardando..." : "Guardar Proveedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
