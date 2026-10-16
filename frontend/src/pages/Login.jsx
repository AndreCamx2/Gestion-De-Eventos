import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { Boton, Campo } from "../components/ui";
import "../styles/acceso.css";

// Pasos que se muestran junto al formulario (maqueta Main.dc.html).
const PASOS = [
  { numero: 1, texto: "Cotiza con aforo y precios al día", tono: "tinta" },
  { numero: 2, texto: "Ve qué salón está libre cada día", tono: "durazno" },
  { numero: 3, texto: "Confirma con la garantía del cliente", tono: "mantequilla" },
];

const MSG_MUCHOS_INTENTOS = "Hiciste muchos intentos seguidos. Espera un minuto y vuelve a intentarlo.";

function LoginForm({ onLoginSuccess }) {
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const email = form.get("email")?.toString().trim();
    const password = form.get("password")?.toString();

    const nextErrors = {};
    if (!email) nextErrors.email = "Ingresa tu usuario o correo.";
    if (!password) nextErrors.password = "Ingresa tu contraseña.";
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);

    try {
      await login(email, password);
      await onLoginSuccess?.({ email });
      navigate("/inicio");
    } catch (err) {
      // SGDE-112: el backend limita los intentos por IP y responde 429.
      setErrors({
        password: err.status === 429 ? MSG_MUCHOS_INTENTOS : "Usuario o contraseña incorrectos.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="acceso-tarjeta-envoltura">
      <span className="acceso-circulo acceso-circulo--grande" aria-hidden="true" />
      <span className="acceso-circulo acceso-circulo--mediano" aria-hidden="true" />
      <span className="acceso-circulo acceso-circulo--pequeno" aria-hidden="true" />

      <form className="acceso-tarjeta" noValidate onSubmit={handleSubmit}>
        <div>
          <h2 className="acceso-tarjeta__titulo">Inicia sesión</h2>
          <p className="acceso-tarjeta__subtitulo">Accede a tu panel de gestión de eventos y salones.</p>
        </div>

        <Campo
          etiqueta={<>Usuario o correo electrónico <span className="acceso-obligatorio" aria-hidden="true">*</span></>}
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          placeholder="nombre@empresa.com"
          required
          error={errors.email}
        />

        {/* Contraseña con botón de mostrar/ocultar: Campo no admite un botón
            dentro del input, así que se arma con sus mismas clases. */}
        <div className={`campo${errors.password ? " campo--error" : ""}`}>
          <div className="acceso-clave__cabecera">
            <label className="campo__etiqueta" htmlFor="password">
              Contraseña <span className="acceso-obligatorio" aria-hidden="true">*</span>
            </label>
            <Link to="/recuperar-clave" className="acceso-enlace acceso-enlace--pequeno">
              ¿La olvidaste?
            </Link>
          </div>
          <div className="acceso-clave">
            <input
              className="campo__input acceso-clave__input"
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            <button
              type="button"
              className="acceso-clave__ver"
              onClick={() => setShowPassword((value) => !value)}
              aria-pressed={showPassword}
            >
              {showPassword ? "Ocultar" : "Ver"}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="campo__error">
              {errors.password}
            </p>
          )}
        </div>

        <Boton type="submit" variante="principal" className="acceso-enviar" disabled={submitting}>
          {submitting ? <span className="btn__spinner acceso-spinner" aria-hidden="true" /> : null}
          {submitting ? "Ingresando…" : "Iniciar sesión"}
        </Boton>

        <div className="acceso-divisor" />

        <p className="acceso-pie">
          ¿Aún no tienes cuenta? <Link to="/registro" className="acceso-enlace">Regístrate aquí</Link>
        </p>
      </form>
    </div>
  );
}

export default function Login({ onLoginSuccess }) {
  return (
    <div className="acceso">
      <header className="acceso__cabecera">
        <span className="acceso-logo">
          <span className="acceso-logo__marca" aria-hidden="true">S</span>
          SGDE
        </span>
      </header>

      <main className="acceso__cuerpo">
        <section className="acceso-presentacion">
          <p className="acceso-pildora">
            <span className="acceso-pildora__punto" aria-hidden="true" />
            Gestión de eventos y salones · Cartagena
          </p>
          <h1 className="acceso-presentacion__titular">
            Todo el evento, en <span className="acceso-resaltado">una sola vista</span>.
          </h1>
          <ol className="acceso-pasos">
            {PASOS.map((paso) => (
              <li key={paso.numero} className="acceso-pasos__item">
                <span className={`acceso-pasos__numero acceso-pasos__numero--${paso.tono}`} aria-hidden="true">
                  {paso.numero}
                </span>
                {paso.texto}
              </li>
            ))}
          </ol>
        </section>

        <LoginForm onLoginSuccess={onLoginSuccess} />
      </main>
    </div>
  );
}
