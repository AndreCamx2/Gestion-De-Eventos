import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registrarCliente } from "../api/auth";
import { Boton, Campo } from "../components/ui";
import "../styles/acceso.css";

const ACCOUNT_TYPES = {
  natural: {
    label: "Persona natural",
    fields: [
      { name: "fullName", label: "Nombre completo", type: "text", placeholder: "Maria Bustamante", full: true, autoComplete: "name" },
      { name: "documentId", label: "Cédula / Documento", type: "text", placeholder: "1234567890" },
      { name: "phoneNatural", label: "Teléfono", type: "tel", placeholder: "+57 300 000 0000", autoComplete: "tel" },
      { name: "emailNatural", label: "Correo electrónico", type: "email", placeholder: "maria@correo.com", autoComplete: "email" },
    ],
  },
  empresa: {
    label: "Empresa / Institución",
    fields: [
      { name: "companyName", label: "Razón social", type: "text", placeholder: "Eventos del Caribe S.A.S.", full: true, autoComplete: "organization" },
      { name: "taxId", label: "NIT", type: "text", placeholder: "900123456-7" },
      { name: "contactName", label: "Nombre del contacto", type: "text", placeholder: "Carlos Pérez", autoComplete: "name" },
      { name: "phoneEmpresa", label: "Teléfono", type: "tel", placeholder: "+57 300 000 0000", autoComplete: "tel" },
      { name: "emailEmpresa", label: "Correo corporativo", type: "email", placeholder: "contacto@empresa.com", autoComplete: "email" },
    ],
  },
};

const INITIAL_FORM = {
  fullName: "", documentId: "", phoneNatural: "", emailNatural: "",
  companyName: "", taxId: "", contactName: "", phoneEmpresa: "", emailEmpresa: "",
  password: "", confirmPassword: "",
};

// Pasos del panel izquierdo (maqueta Registro.dc.html).
const PASOS = [
  { numero: 1, titulo: "Crea tu cuenta", texto: "Como persona o como empresa." },
  { numero: 2, titulo: "Recibe tu cotización", texto: "Salón, montaje y servicios con precio final." },
  { numero: 3, titulo: "Confirma con tu garantía", texto: "Y el salón queda reservado para ti." },
];

// Traduce los nombres de campo que devuelve el backend (según el error de
// validación) a los nombres reales del formulario, para poder mostrar el
// error justo debajo del input correspondiente.
function mapBackendErrorField(backendField, accountType) {
  const map = {
    identificacion: accountType === "natural" ? "documentId" : "taxId",
    email: accountType === "natural" ? "emailNatural" : "emailEmpresa",
    razon_social: "companyName",
    nombre: accountType === "natural" ? "fullName" : "contactName",
    password: "password",
  };
  return map[backendField] || null;
}

function Etiqueta({ texto }) {
  return (
    <>
      {texto} <span className="acceso-obligatorio" aria-hidden="true">*</span>
    </>
  );
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
    } else if (form.password.length < 8) {
      nextErrors.password = "Debe tener mínimo 8 caracteres.";
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
      if (err.body && typeof err.body === "object") {
        backendErrors = err.body;
      } else {
        try {
          backendErrors = JSON.parse(err.message);
        } catch {
          // El mensaje no era JSON, lo tratamos como error general más abajo.
        }
      }

      const mappedErrors = {};
      Object.entries(backendErrors).forEach(([field, messages]) => {
        const mappedField = mapBackendErrorField(field, accountType);
        // El backend puede devolver varios mensajes por campo (p. ej. contraseña): se muestran todos.
        const message = Array.isArray(messages) ? messages.join(" ") : messages;
        if (mappedField) {
          mappedErrors[mappedField] = message;
        }
      });

      if (Object.keys(mappedErrors).length > 0) {
        setErrors(mappedErrors);
      } else if (err.body?.detail) {
        setErrors({ general: err.body.detail });
      } else {
        setErrors({ general: "No se pudo crear la cuenta. Verifica los datos e intenta de nuevo." });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const activeFields = ACCOUNT_TYPES[accountType].fields;

  return (
    <div className="registro">
      <aside className="registro-panel">
        <span className="acceso-circulo acceso-circulo--panel-grande" aria-hidden="true" />
        <span className="acceso-circulo acceso-circulo--panel-pequeno" aria-hidden="true" />

        <Link to="/login" className="acceso-logo">
          <span className="acceso-logo__marca" aria-hidden="true">S</span>
          SGDE
        </Link>

        <p className="registro-panel__titular">Tu próximo evento empieza aquí.</p>

        <ol className="registro-pasos">
          {PASOS.map((paso) => (
            <li key={paso.numero} className="registro-pasos__item">
              <span
                className={`registro-pasos__numero${paso.numero === 1 ? " registro-pasos__numero--activo" : ""}`}
                aria-hidden="true"
              >
                {paso.numero}
              </span>
              <span>
                <span className="registro-pasos__titulo">{paso.titulo}</span>
                <span className="registro-pasos__texto">{paso.texto}</span>
              </span>
            </li>
          ))}
        </ol>
      </aside>

      <main className="registro-cuerpo">
        <div className="registro-formulario">
          <div>
            <h1 className="registro-formulario__titulo">Crea tu cuenta</h1>
            <p className="registro-formulario__subtitulo">
              Regístrate para solicitar cotizaciones y gestionar tus eventos.
            </p>
          </div>

          <div className="registro-tipo">
            <p className="campo__etiqueta" id="tipo-cuenta">Tipo de cuenta</p>
            <div className="registro-tipo__opciones" role="tablist" aria-labelledby="tipo-cuenta">
              {Object.entries(ACCOUNT_TYPES).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  className={`registro-tipo__opcion${accountType === key ? " is-active" : ""}`}
                  role="tab"
                  aria-selected={accountType === key}
                  onClick={() => handleAccountTypeChange(key)}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          {success && (
            <div className="acceso-aviso acceso-aviso--exito" role="status">
              Cuenta creada correctamente. Te llevamos al inicio de sesión…
            </div>
          )}

          {errors.general && (
            <div className="acceso-aviso acceso-aviso--error" role="alert">
              {errors.general}
            </div>
          )}

          <form noValidate onSubmit={handleSubmit} className="registro-campos">
            <div className="registro-rejilla">
              {activeFields.map((field) => (
                <Campo
                  key={field.name}
                  className={field.full ? "registro-rejilla__completo" : ""}
                  etiqueta={<Etiqueta texto={field.label} />}
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  autoComplete={field.autoComplete}
                  value={form[field.name]}
                  onChange={handleChange}
                  required
                  error={errors[field.name]}
                />
              ))}
            </div>

            {/* Las contraseñas van en su propia fila, separadas de los datos */}
            <div className="registro-rejilla">
              <Campo
                etiqueta={<Etiqueta texto="Contraseña" />}
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={handleChange}
                required
                error={errors.password}
              />

              <Campo
                etiqueta={<Etiqueta texto="Confirmar contraseña" />}
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                error={errors.confirmPassword}
              />
            </div>

            <Boton type="submit" variante="principal" className="acceso-enviar" disabled={submitting}>
              {submitting ? <span className="btn__spinner acceso-spinner" aria-hidden="true" /> : null}
              {submitting ? "Creando cuenta…" : "Crear mi cuenta"}
            </Boton>

            <p className="acceso-pie">
              ¿Ya tienes cuenta? <Link to="/login" className="acceso-enlace">Inicia sesión</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
