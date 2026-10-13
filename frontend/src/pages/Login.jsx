import { useState } from "react";
import { login } from "../api/auth";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import image0 from "../img/images(0).jpg";
import image1 from "../img/images (1).jpg";
import image2 from "../img/images(2).jpg";
import image3 from "../img/images (3).jpg";
import image4 from "../img/images(4).jpg";
import image5 from "../img/images(5).jpg";
import image6 from "../img/images(6).jpg";
import image7 from "../img/images(7).jpg";
import image8 from "../img/images(8).jpg";
import image9 from "../img/images(9).jpg";

const COLUMN_A = [image0, image1, image2, image3, image4];
const COLUMN_B = [image5, image6, image7, image8, image9];

function CarouselColumn({ images, direction = "up" }) {
  const loopedImages = [...images, ...images];

  return (
    <div className="auth-carousel__column">
      <div className={`auth-carousel__track auth-carousel__track--${direction}`}>
        {loopedImages.map((src, index) => (
          <div className="auth-carousel__item" key={`${src}-${index}`}>
            <img src={src} alt="" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginForm({ onLoginSuccess }) {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
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
    setErrors({ password: "Usuario o contraseña incorrectos." });
  } finally {
    setSubmitting(false);
  }
}

  return (
    <main className="auth-main">
      <div className="auth-card">
        <p className="auth-mark--mobile">SGDE</p>

        <h2 className="auth-title">Inicia sesión</h2>
        <p className="auth-subtitle">Accede a tu panel de gestión de eventos y salones.</p>

        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          <div className="field" id="fieldEmail">
            <label className="field__label" htmlFor="email">
              Usuario o correo electrónico <span className="field__required">*</span>
            </label>
            <div className="field__control">
              <input
                className="field__input"
                type="text"
                id="email"
                name="email"
                autoComplete="username"
                placeholder="nombre@empresa.com"
              />
            </div>
            {errors.email && <p className="field__error">{errors.email}</p>}
          </div>

          <div className="field" id="fieldPassword">
            <label className="field__label" htmlFor="password">
              Contraseña <span className="field__required">*</span>
            </label>
            <div className="field__control">
              <input
                className="field__input field__input--with-action"
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="field__action"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
            {errors.password && <p className="field__error">{errors.password}</p>}
          </div>

          <div className="auth-form__row">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember((value) => !value)}
              />
              Recordarme
            </label>
            <button type="button" className="link">
              Olvidé mi contraseña
            </button>
          </div>

          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? <span className="btn__spinner" aria-hidden="true" /> : null}
            <span className="btn__label">{submitting ? "Ingresando…" : "Iniciar sesión"}</span>
          </button>
        </form>

        <p className="auth-footer">
          ¿Aún no tienes cuenta? <a href="/registro" className="link">Regístrate aquí</a>
        </p>
      </div>
    </main>
  );
} // <--- FALTABA CERRAR LoginForm AQUÍ

export default function Login({ onLoginSuccess }) {
  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div className="auth-carousel" aria-hidden="true">
          <CarouselColumn images={COLUMN_A} direction="up" />
          <CarouselColumn images={COLUMN_B} direction="down" />
        </div>

        <div className="auth-brand__scrim" />

        <div className="auth-brand__content">
          <div className="auth-brand__top">
            <p className="auth-brand__mark">SGDE</p>
            <p className="auth-brand__tag">Gestión de Eventos &amp; Salones · Cartagena</p>
          </div>
          <div className="auth-brand__bottom">
            <h1 className="auth-brand__headline">Cada evento merece un salón a su altura.</h1>
            <p className="auth-brand__copy">
              Coordina cotizaciones, disponibilidad y clientes desde un solo lugar,
              con la precisión que exige la organización de eventos en Cartagena.
            </p>
            <div className="auth-brand__rule" />
          </div>
        </div>
      </aside>

      <LoginForm onLoginSuccess={onLoginSuccess} />
    </div>
  );
}
