import { useEffect, useRef } from "react";
import "./Dialogo.css";

export default function Dialogo({ idTitulo, titulo, bloqueado = false, onCerrar, className = "", children }) {
  const dialogoRef = useRef(null);

  useEffect(() => {
    const dialogo = dialogoRef.current;
    // En desarrollo StrictMode corre el efecto dos veces: solo se abre una.
    if (dialogo.open) return;
    dialogo.showModal();
    const inicial =
      dialogo.querySelector("[data-foco-inicial]:not(:disabled)") ??
      dialogo.querySelector("input, select, textarea");
    inicial?.focus();
  }, []);

  return (
    <dialog
      ref={dialogoRef}
      className={["dialogo", className].filter(Boolean).join(" ")}
      aria-labelledby={idTitulo}
      onCancel={(e) => bloqueado && e.preventDefault()}
      onClose={onCerrar}
    >
      <div className="dialogo__cabecera">
        <h2 id={idTitulo} className="dialogo__titulo">
          {titulo}
        </h2>
        <button
          type="button"
          className="dialogo__cerrar"
          aria-label="Cerrar"
          disabled={bloqueado}
          onClick={() => dialogoRef.current?.close()}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      {children}
    </dialog>
  );
}
