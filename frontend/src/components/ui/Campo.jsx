import { useId } from "react";
import "./Campo.css";

export default function Campo({ etiqueta, id, error, className = "", ...resto }) {
  const idGenerado = useId();
  const idCampo = id ?? idGenerado;
  const idError = `${idCampo}-error`;

  return (
    <div className={["campo", error && "campo--error", className].filter(Boolean).join(" ")}>
      <label className="campo__etiqueta" htmlFor={idCampo}>
        {etiqueta}
      </label>
      <input
        id={idCampo}
        className="campo__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        {...resto}
      />
      {error && (
        <p id={idError} className="campo__error">
          {error}
        </p>
      )}
    </div>
  );
}
