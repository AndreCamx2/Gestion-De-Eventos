import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registrarCliente } from "../api/auth";
import "../styles/register.css";

const ACCOUNT_TYPES = {
  natural: {
    label: "Persona Natural",
    fields: [
      { name: "fullName", label: "Nombre completo", type: "text", placeholder: "Maria Bustamante", full: true },
      { name: "documentId", label: "Cédula / Documento", type: "text", placeholder: "1234567890" },
      { name: "phoneNatural", label: "Teléfono", type: "tel", placeholder: "+57 300 000 0000" },
      { name: "emailNatural", label: "Correo electrónico", type: "email", placeholder: "maria@correo.com" },
    ],
  },
  empresa: {
    label: "Empresa / Institución",
    fields: [
      { name: "companyName", label: "Razón social", type: "text", placeholder: "Eventos del Caribe S.A.S.", full: true },
      { name: "taxId", label: "NIT", type: "text", placeholder: "900123456-7" },
      { name: "contactName", label: "Nombre del contacto", type: "text", placeholder: "Carlos Pérez" },
      { name: "phoneEmpresa", label: "Teléfono", type: "tel", placeholder: "+57 300 000 0000" },
      { name: "emailEmpresa", label: "Correo corporativo", type: "email", placeholder: "contacto@empresa.com" },
    ],
  },
};

const INITIAL_FORM = {
  fullName: "", documentId: "", phoneNatural: "", emailNatural: "",
  companyName: "", taxId: "", contactName: "", phoneEmpresa: "", emailEmpresa: "",
  password: "", confirmPassword: "",
};

// Traduce los nombres de campo que devuelve el backend (según el error de
// validación) a los nombres reales del formulario, para poder mostrar el
// error justo debajo del input correspondiente.
function mapBackendErrorField(backendField, accountType) {
  const map = {
    identificacion: accountType === "natural" ? "documentId" : "taxId",
    email: accountType === "natural" ? "emailNatural" : "emailEmpresa",
    razon_social: "companyName",
    nombre: accountType === "natural" ? "fullName" : "contactName",
  };
  return map[backendField] || null;
}

export default function Registrar() {
  const [accountType, setAccountType] = useState("natural");
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleAccountTypeChange(nextType) {
    setAccountType(nextType);
    setErrors({}); // Al cambiar de tipo, limpiamos avisos del tipo anterior
  }

  function validate() {
    const nextErrors = {};
    const activeFields = ACCOUNT_TYPES[accountType].fields;

    activeFields.forEach((field) => {
      if (!form[field.name]?.trim()) {
        nextErrors[field.name] = "Este campo es obligatorio.";
      }
    });

    if (!form.password) {
      nextErrors.password = "Ingresa una contraseña.";
    } else if (form.password.length < 6) {
      nextErrors.password = "Debe tener mínimo 6 caracteres.";
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = "Confirma tu contraseña.";
    } else if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setSuccess(false);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await registrarCliente({
        tipo: accountType === "empresa" ? "juridica" : "natural",
        nombre: accountType === "natural" ? form.fullName : form.contactName,
        identificacion: accountType === "natural" ? form.documentId : form.taxId,
        telefono: accountType === "natural" ? form.phoneNatural : form.phoneEmpresa,
        email: accountType === "natural" ? form.emailNatural : form.emailEmpresa,
        password: form.password,
        razonSocial: form.companyName,
      });

      setSuccess(true);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      let backendErrors = {};
      try {
        backendErrors = JSON.parse(err.message);
      } catch {
        // El mensaje no era JSON, lo tratamos como error general más abajo.
      }

      const mappedErrors = {};
      Object.entries(backendErrors).forEach(([field, messages]) => {
        const mappedField = mapBackendErrorField(field, accountType);
        const message = Array.isArray(messages) ? messages[0] : messages;
        if (mappedField) {
          mappedErrors[mappedField] = message;
        }
      });

      if (Object.keys(mappedErrors).length > 0) {
        setErrors(mappedErrors);
      } else {
        setErrors({ general: "No se pudo crear la cuenta. Verifica los datos e intenta de nuevo." });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const activeFields = ACCOUNT_TYPES[accountType].fields;

  return (
    <div className="register-shell">
      <div className="register-card">
        <div className="register-card__header">
          <p className="auth-brand__mark">SGDE</p>
          <h1 className="register-card__title">Crea tu cuenta</h1>
          <p className="register-card__subtitle">
            Regístrate para solicitar cotizaciones y gestionar tus eventos.
          </p>
        </div>

        <div className="register-card__body">
          <div className="tabs" role="tablist" aria-label="Tipo de cuenta">
            {Object.entries(ACCOUNT_TYPES).map(([key, config]) => (
              <button
                key={key}
                type="button"
                className={`tab ${accountType === key ? "is-active" : ""}`}
                role="tab"
                aria-selected={accountType === key}
                onClick={() => handleAccountTypeChange(key)}
              >
                {config.label}
              </button>
            ))}
          </div>

          {success && (
            <div className="alert alert--success" role="status" style={{ marginTop: 24 }}>
              Cuenta creada correctamente.
            </div>
          )}

          {errors.general && (
            <div className="alert alert--error" role="alert" style={{ marginTop: 24 }}>
              {errors.general}
            </div>
          )}

          <form noValidate onSubmit={handleSubmit}>
            <div className="form-grid">
              {activeFields.map((field) => (
                <div
                  className={`field ${field.full ? "form-grid__full" : ""}`}
                  key={field.name}
                >
                  <label className="field__label" htmlFor={field.name}>
                    {field.label} <span className="field__required">*</span>
                  </label>
                  <div className="field__control">
                    <input
                      className="field__input"
                      type={field.type}
                      id={field.name}
                      name={field.name}
                      placeholder={field.placeholder}
                      value={form[field.name]}
                      onChange={handleChange}
                    />
                  </div>
                  {errors[field.name] && <p className="field__error">{errors[field.name]}</p>}
                </div>
              ))}
            </div>

            <div className="form-grid" style={{ marginTop: 20 }}>
              <div className="field">
                <label className="field__label" htmlFor="password">
                  Contraseña <span className="field__required">*</span>
                </label>
                <div className="field__control">
                  <input
                    className="field__input"
                    type="password"
                    id="password"
                    name="password"
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={handleChange}
                  />
                </div>
                {errors.password && <p className="field__error">{errors.password}</p>}
              </div>

              <div className="field">
                <label className="field__label" htmlFor="confirmPassword">
                  Confirmar contraseña <span className="field__required">*</span>
                </label>
                <div className="field__control">
                  <input
                    className="field__input"
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    autoComplete="new-password"
                    placeholder="Repite tu contraseña"
                    value={form.confirmPassword}
                    onChange={handleChange}
                  />
                </div>
                {errors.confirmPassword && <p className="field__error">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div className="register-actions">
              <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
                {submitting ? <span className="btn__spinner" aria-hidden="true" /> : null}
                <span className="btn__label">{submitting ? "Creando cuenta…" : "Crear cuenta"}</span>
              </button>
              <p className="register-actions__footer">
                ¿Ya tienes cuenta? <a href="/login" className="link">Inicia sesión</a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}