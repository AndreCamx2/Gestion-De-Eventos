import { useState } from "react";

export default function CampoClave({ id, etiqueta, error, autoComplete = "new-password" }) {
  const [visible, setVisible] = useState(false);
  const idError = `${id}-error`;

  return (
    <div className={`campo${error ? " campo--error" : ""}`}>
      <label className="campo__etiqueta" htmlFor={id}>
        {etiqueta} <span className="acceso-obligatorio" aria-hidden="true">*</span>
      </label>
      <div className="acceso-clave">
        <input
          className="campo__input acceso-clave__input"
          type={visible ? "text" : "password"}
          id={id}
          name={id}
          autoComplete={autoComplete}
          placeholder="••••••••"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idError : undefined}
        />
        <button
          type="button"
          className="acceso-clave__ver"
          onClick={() => setVisible((valor) => !valor)}
          aria-pressed={visible}
        >
          {visible ? "Ocultar" : "Ver"}
        </button>
      </div>
      {error && (
        <p id={idError} className="campo__error">
          {error}
        </p>
      )}
    </div>
  );
}
