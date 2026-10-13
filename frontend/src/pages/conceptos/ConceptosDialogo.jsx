import { useEffect, useRef } from "react";

// Ventana de Conceptos ("Nuevo concepto" y activar o desactivar). Usa <dialog>
// nativo: showModal() deja inactivo el fondo, encierra el foco y cierra con Escape.
//
// Se pinta ya abierta: Conceptos.jsx la monta solo mientras está activa y la
// quita cuando avisa con onCerrar (Escape, la X o "Cancelar").
// - bloqueado: mientras se guarda, ni Escape ni la X la cierran.
// - El foco inicial va al elemento marcado con data-foco-inicial, o al primer campo.
export default function ConceptosDialogo({ idTitulo, titulo, bloqueado, onCerrar, children }) {
  const dialogoRef = useRef(null);

  useEffect(() => {
    const dialogo = dialogoRef.current;
    // En desarrollo StrictMode corre el efecto dos veces: solo se abre una.
    if (dialogo.open) return;
    dialogo.showModal();
    const inicial =
      dialogo.querySelector("[data-foco-inicial]:not(:disabled)") ??
      dialogo.querySelector("input, select, button:not(.conceptos-dialogo__cerrar)");
    inicial?.focus();
  }, []);

  return (
    <dialog
      ref={dialogoRef}
      className="conceptos-dialogo"
      aria-labelledby={idTitulo}
      onCancel={(e) => bloqueado && e.preventDefault()}
      onClose={onCerrar}
    >
      <div className="conceptos-dialogo__cabecera">
        <h2 id={idTitulo} className="conceptos-dialogo__titulo">
          {titulo}
        </h2>
        <button
          type="button"
          className="conceptos-dialogo__cerrar"
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

// Cierra el <dialog> que contiene al elemento (para los botones "Cancelar").
export function cerrarDialogoDe(elemento) {
  elemento?.closest("dialog")?.close();
}
