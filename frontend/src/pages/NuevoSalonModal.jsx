import { useState } from "react";
import "../styles/nuevo-salon.css";

const MONTAJES_DISPONIBLES = ["Teatro", "Banquete", "Cóctel", "Escuela"];

const INITIAL_FORM = {
  nombre: "",
  capacidad: "",
  montajes: [],
  foto: null,
};

export default function NuevoSalonModal({ onClose, onCreate }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleToggleMontaje(montaje) {
    setForm((prev) => {
      const yaEstaba = prev.montajes.includes(montaje);
      const montajes = yaEstaba
        ? prev.montajes.filter((item) => item !== montaje)
        : [...prev.montajes, montaje];
      return { ...prev, montajes };
    });
  }

  function handleFotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({ ...prev, foto: file }));
    setPreviewUrl(URL.createObjectURL(file));
  }

  function validate() {
    const nextErrors = {};
    if (!form.nombre.trim()) nextErrors.nombre = "El nombre del salón es obligatorio.";
    if (!form.capacidad) {
      nextErrors.capacidad = "Ingresa la capacidad máxima.";
    } else if (Number(form.capacidad) <= 0) {
      nextErrors.capacidad = "La capacidad debe ser mayor a 0.";
    }
    if (form.montajes.length === 0) nextErrors.montajes = "Selecciona al menos un tipo de montaje.";
    return nextErrors;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setTimeout(() => {
      onCreate({
        id: Date.now(),
        nombre: form.nombre.trim(),
        estado: "Disponible",
        capacidad: Number(form.capacidad),
        montajes: form.montajes,
        foto: previewUrl,
      });
      setSubmitting(false);
      onClose();
    }, 600);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-card__header">
          <h2>Nuevo salón</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="nombre">
              Nombre del salón <span className="field__required">*</span>
            </label>
            <input
              className="field__input"
              type="text"
              id="nombre"
              name="nombre"
              placeholder="Salón Imperial"
              value={form.nombre}
              onChange={handleChange}
            />
            {errors.nombre && <p className="field__error">{errors.nombre}</p>}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="capacidad">
              Capacidad máxima <span className="field__required">*</span>
            </label>
            <input
              className="field__input"
              type="number"
              id="capacidad"
              name="capacidad"
              placeholder="200"
              min="1"
              value={form.capacidad}
              onChange={handleChange}
            />
            {errors.capacidad && <p className="field__error">{errors.capacidad}</p>}
          </div>

          <div className="field">
            <span className="field__label">
              Tipos de montaje <span className="field__required">*</span>
            </span>
            <div className="montaje-options">
              {MONTAJES_DISPONIBLES.map((montaje) => (
                <label className="montaje-chip" key={montaje}>
                  <input
                    type="checkbox"
                    checked={form.montajes.includes(montaje)}
                    onChange={() => handleToggleMontaje(montaje)}
                  />
                  {montaje}
                </label>
              ))}
            </div>
            {errors.montajes && <p className="field__error">{errors.montajes}</p>}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="foto">Foto del salón (opcional)</label>
            <label className="upload-box" htmlFor="foto">
              {previewUrl ? (
                <img src={previewUrl} alt="Vista previa del salón" className="upload-preview" />
              ) : (
                <span>Arrastra una imagen o haz clic para subir</span>
              )}
            </label>
            <input
              type="file"
              id="foto"
              accept="image/*"
              onChange={handleFotoChange}
              hidden
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn--outline" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Guardando…" : "Guardar salón"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
