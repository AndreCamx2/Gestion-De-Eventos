import { useEffect, useRef } from "react";

// Ventana para los formularios de Salones ("Nuevo salón" y "Habilitar montaje").
// Usa <dialog> nativo: showModal() deja inactivo el fondo, encierra el foco
// dentro y cierra con Escape (evento "cancel").
//
// Se pinta ya abierta: Salones.jsx la monta solo mientras está activa. Al
// cerrarse (Escape, la X o "Cancelar") avisa con onCerrar; Salones.jsx la quita
// y devuelve el foco al botón que la abrió.
// - bloqueado: mientras se guarda, Escape no la cierra.
// - El foco inicial va al campo marcado con data-foco-inicial, o al primero.
export default function SalonDialogo({ idTitulo, titulo, bloqueado, onCerrar, children }) {
  const dialogoRef = useRef(null);

  useEffect(() => {
    const dialogo = dialogoRef.current;
    // En desarrollo StrictMode corre el efecto dos veces: solo se abre una.
    if (dialogo.open) return;
    dialogo.showModal();
    const inicial =
      dialogo.querySelector("[data-foco-inicial]") ?? dialogo.querySelector("select, input");
    inicial?.focus();
  }, []);

  return (
    <dialog
      ref={dialogoRef}
      className="salones-dialogo"
      aria-labelledby={idTitulo}
      onCancel={(e) => bloqueado && e.preventDefault()}
      onClose={onCerrar}
    >
      <div className="salones-dialogo__cabecera">
        <h2 id={idTitulo} className="salones-dialogo__titulo">
          {titulo}
        </h2>
        <button
          type="button"
          className="salones-dialogo__cerrar"
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
