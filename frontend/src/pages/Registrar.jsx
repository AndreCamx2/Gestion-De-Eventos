import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registrarCliente } from "../api/auth";
import { Boton, Campo } from "../components/ui";
import {
  MAX_PASSWORD,
  limpiarDocumento,
  limpiarTelefono,
  quitarEspacios,
} from "../utils/validacionesRegistro";
import { ACCOUNT_TYPES, INITIAL_FORM, validarCampo } from "./registro/camposRegistro";
import "../styles/acceso.css";

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
    telefono: accountType === "natural" ? "phoneNatural" : "phoneEmpresa",
    // La ciudad no está en el formulario (se envía fija): su error va al aviso general (SGDE-115).
    ciudad: "general",
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
  const [acepta, setAcepta] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  function handleChange(event) {
    const { name, value } = event.target;
    const campo = ACCOUNT_TYPES[accountType].fields.find((field) => field.name === name);
    const valor = campo?.filtro ? campo.filtro(value) : value;
    const siguiente = { ...form, [name]: valor };
    setForm(siguiente);
    setErrors((prev) => {
      const actualizados = { ...prev, general: null };
      if (prev[name]) actualizados[name] = validarCampo(name, siguiente, accountType);
      if (name === "password" && prev.confirmPassword) {
        actualizados.confirmPassword = validarCampo("confirmPassword", siguiente, accountType);
      }
      return actualizados;
    });
  }

  function handleBlur(event) {
    const { name, value } = event.target;
    if (!value) return;
    setErrors((prev) => ({ ...prev, [name]: validarCampo(name, form, accountType) }));
  }

  function handleAccountTypeChange(nextType) {
    setAccountType(nextType);
    setErrors({});
  }

  function handleAceptaChange(event) {
    setAcepta(event.target.checked);
    if (event.target.checked) setErrors((prev) => ({ ...prev, acepta: null }));
  }

  function validate() {
    const nextErrors = {};
    const nombres = [...ACCOUNT_TYPES[accountType].fields.map((field) => field.name), "password", "confirmPassword"];
    nombres.forEach((name) => {
      const error = validarCampo(name, form, accountType);
      if (error) nextErrors[name] = error;
    });
    if (!acepta) nextErrors.acepta = "Debes autorizar el tratamiento de tus datos para crear la cuenta.";
    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    const nextErrors = validate();
    setErrors(nextErrors);
    setSuccess(false);

    const primerError = Object.keys(nextErrors)[0];
    if (primerError) {
      document.getElementById(primerError)?.focus();
      return;
    }

    const natural = accountType === "natural";
    setSubmitting(true);
    try {
      await registrarCliente({
        tipo: natural ? "natural" : "juridica",
        nombre: quitarEspacios(natural ? form.fullName : form.contactName),
        identificacion: limpiarDocumento(natural ? form.documentId : form.taxId),
        telefono: limpiarTelefono(natural ? form.phoneNatural : form.phoneEmpresa),
        email: (natural ? form.emailNatural : form.emailEmpresa).trim().toLowerCase(),
        password: form.password,
        razonSocial: quitarEspacios(form.companyName),
      });

      setSuccess(true);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      if (!err.status) {
        setErrors({ general: "No hay conexión con el servidor. Revisa tu internet e intenta de nuevo." });
        return;
      }
      if (err.status === 429) {
        setErrors({ general: err.body?.detail || "Hiciste muchos intentos seguidos. Espera un momento." });
        return;
      }

      const backendErrors = err.body && typeof err.body === "object" ? err.body : {};
      const mappedErrors = {};
      Object.entries(backendErrors).forEach(([field, messages]) => {
        const mappedField = mapBackendErrorField(field, accountType);
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
                  inputMode={field.inputMode}
                  maxLength={field.maxLength}
                  value={form[field.name]}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={submitting}
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
                placeholder="Mínimo 8, con letras y números"
                maxLength={MAX_PASSWORD}
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={submitting}
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
                maxLength={MAX_PASSWORD}
                value={form.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={submitting}
                required
                error={errors.confirmPassword}
              />
            </div>

            <div className={`registro-consentimiento${errors.acepta ? " registro-consentimiento--error" : ""}`}>
              <label className="registro-consentimiento__fila">
                <input
                  type="checkbox"
                  id="acepta"
                  name="acepta"
                  checked={acepta}
                  onChange={handleAceptaChange}
                  disabled={submitting}
                  aria-invalid={errors.acepta ? true : undefined}
                  aria-describedby={errors.acepta ? "acepta-error" : undefined}
                />
                <span>
                  Autorizo el tratamiento de mis datos personales según la Ley 1581 de 2012.{" "}
                  <span className="acceso-obligatorio" aria-hidden="true">*</span>
                </span>
              </label>
              {errors.acepta && (
                <p id="acepta-error" className="campo__error">
                  {errors.acepta}
                </p>
              )}
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
